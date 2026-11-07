# Windows Server setup and component launcher

The repository includes two entry points:

- `init-windows.ps1`: installs the selected component, generates missing configuration and builds the web app when selected.
- `start-windows.ps1`: starts **Real Estate**, **WhatsApp**, or **Both** using a menu or an explicit parameter.

The launcher uses production `next start`, not the development server. WhatsApp has its own dependencies, configuration and Chromium session under `services/openwa`.

## 1. Prepare the server

Copy/clone the source repository into a local folder such as `C:\Apps\41-real-estate`. Include both `package-lock.json` files and `services\openwa`. Do not copy macOS/Linux `node_modules` or `.next` build output: setup installs and builds for Windows.

Install an official **Node.js 22.x LTS** Windows x64 runtime, version **22.22.2 or newer within 22.x**, with npm included, then reopen PowerShell. This version satisfies the existing WhatsApp package's `>=22.22.2 <23` engine requirement and also runs the website. Web-only installations can use a supported even-numbered LTS release >=22. The scripts do not download or replace Node.js automatically. The repository's `.nvmrc` pins 22.23.4 for both local development and this deployment.

Use Windows PowerShell 5.1 or PowerShell 7. Place configuration and WhatsApp session folders on persistent local storage. The account running the app needs read/write access to this application folder, including `.next`, dependencies and the WhatsApp browser profile. Restrict NTFS access to environment files and session folders to the deployment account and administrators.

You need an existing MongoDB Atlas database or another replica-set MongoDB deployment for the web app's management transactions. Setup does not create a database, seed demo data or reset an administrator account.

Node's production guidance and release status: [Node.js releases](https://nodejs.org/en/about/previous-releases), [official downloads](https://nodejs.org/en/download). PowerShell invocation: [Microsoft about Scripts](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_scripts?view=powershell-5.1).

## 2. Initialize the component you need

Open PowerShell in the repository:

```powershell
cd C:\Apps\41-real-estate
.\init-windows.ps1
```

The menu offers:

```text
1. Real Estate app only
2. WhatsApp service only
3. Both
0. Exit
```

Or choose explicitly:

```powershell
.\init-windows.ps1 -Component Web
.\init-windows.ps1 -Component WhatsApp
.\init-windows.ps1 -Component Both -Start
```

Setup runs `npm.cmd ci` independently for each selected component. The web installation includes build dependencies even if the server's environment is production. OpenWA/browser installation may take several minutes.

The setup prompts for the public website origin, a masked MongoDB URI, and an optional masked Cloudinary URL. Blank secret prompts keep existing values. For a fresh web setup the MongoDB URI is required. Encode special characters in URI usernames/passwords. Production origins use HTTPS; HTTP is accepted for loopback addresses only. Use just the origin, such as `https://www.41real-estate.site`, without a path.

Configuration behavior:

- Existing nonempty environment values are preserved. `NEXTAUTH_SECRET` is never automatically rotated, because it also encrypts saved WhatsApp credentials.
- Missing web values are appended to `.env.local`; a fresh authentication secret is generated automatically. Next.js production environment-file precedence is respected.
- Missing WhatsApp values are appended to `services\openwa\.env`; a random API key is generated when needed.
- Selecting **Both** uses a local `127.0.0.1` webhook to the website and aligns missing local integration settings using one key; it refuses to replace conflicting saved keys or a web app already targeting another WhatsApp gateway. Resolve conflicts explicitly in the environment files.
- WhatsApp-only setup requires neither MongoDB nor the web app dependencies. For a remotely hosted website, enter its public HTTPS origin so the webhook points to that website.
- The default website port is 3000; WhatsApp uses 8080 and an internal upstream on 8081. Existing service `PORT` is preserved. Ports must not overlap.
- Web-port selection is saved in the ignored `.windows-server.json`. For example, use `-WebPort 3001` at setup to persist a different local web port.
- The website is built with Webpack using `npm run build -- --webpack`.

Image uploads require a valid `CLOUDINARY_URL`. Leaving it blank keeps the rest of the website usable but does not configure uploads.

If Windows blocks locally reviewed scripts, follow your administrator's signing/execution policy. Where your organization permits it, a reviewed local script can use a session-only policy via `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned`; this ends with that PowerShell session and does not override Group Policy. For a downloaded repository, use **Unblock-File** on the reviewed `.ps1` files when appropriate; do not change machine-wide execution policy to Unrestricted. Example for the three reviewed entry/support scripts:

```powershell
Unblock-File .\init-windows.ps1
Unblock-File .\start-windows.ps1
Unblock-File .\scripts\windows\common.ps1
```

## 3. Choose what starts

```powershell
.\start-windows.ps1
```

Or skip the menu:

```powershell
# Website only
.\start-windows.ps1 -Component Web

# WhatsApp only
.\start-windows.ps1 -Component WhatsApp

# Both together
.\start-windows.ps1 -Component Both

# Check configuration/dependencies without launching anything
.\start-windows.ps1 -Component Both -Check
```

`-Check` does not bind ports or test database credentials, external connectivity, Chromium startup, or WhatsApp pairing. A running service is not proof that WhatsApp is paired; use the dashboard connection page.

Before launching, the script checks the relevant build/dependencies, required configuration, Node compatibility and port availability. It never terminates a process already using a port. It launches Node directly with argument arrays, so repository paths containing spaces work and API keys are not passed as command-line arguments.

Machine/user environment variables can override file values; review them if a port or key differs from the file. The services run in the current console. Use **Ctrl+C** to stop the processes started by that launcher, including their Windows child-process trees. If one selected service exits, the launcher stops the other selected service rather than silently leaving a half-running pair. It does not kill unrelated Node or Chrome processes. This is a foreground launcher, not an automatically registered Windows Service.

You can override the web port for one launch:

```powershell
.\start-windows.ps1 -Component Web -WebPort 3001
```

For local testing, `SITE_URL` and `NEXTAUTH_URL` must match the actual browser origin/port. A port override does not rewrite them. A public reverse-proxy deployment can change its internal port while keeping its public origin unchanged.

## 4. Public website and WhatsApp connection

By default, the web app binds `127.0.0.1`; publish it through your HTTPS reverse proxy/IIS configuration. Preserve the public host/protocol and set `SITE_URL` and `NEXTAUTH_URL` to the public website origin. Configure DNS and certificates separately. These scripts do not install IIS, modify firewall rules or expose WhatsApp ports.

An explicit web binding is available when needed:

```powershell
.\start-windows.ps1 -Component Web -BindAddress 0.0.0.0
```

The WhatsApp gateway and its upstream remain bound to loopback. If WhatsApp is on a separate server from the website, configure an authenticated HTTPS reverse proxy for the gateway and enter that public gateway URL and matching API key in **Dashboard → WhatsApp settings**. Do not expose the internal upstream port.

Open `/dashboard/whatsapp` on the website, check the server URL/API key, then scan the QR code. Settings already saved in the application's database take precedence over environment defaults: update those saved settings if the previous deployment used another gateway. Review `WHATSAPP_WEBHOOK_URL` in the service `.env` when moving domains; existing values are preserved.

The browser profile under `_IGNORE_property-office-user` is persistent authentication state. Keep it private and retain it across deployments; do not run two WhatsApp processes against the same profile.

For an initial administrator on a new database, use the existing `npm run create-admin` workflow described in the README. Setup intentionally does not invoke it or reset existing users.

## 5. Optional unattended startup

The setup script does **not** register boot tasks or Windows Services. If you need unattended startup, create a Task Scheduler task under a dedicated deployment account and choose **Run whether user is logged on or not**. Give that account access to the app/profile folders and its required batch-logon rights; do not run the app as SYSTEM just to avoid account setup.

Use a startup trigger, disable the default execution time limit for this long-running task, select **Do not start a new instance**, and configure restart-on-failure as appropriate. Example action:

```text
Program: C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
Arguments: -NoProfile -File "C:\Apps\41-real-estate\start-windows.ps1" -Component Both
Start in: C:\Apps\41-real-estate
```

Use `-Component Web` or `WhatsApp` instead if you want independent tasks. Do not register a task with the interactive component menu or start a second copy in a console while a task is using the same ports/session. Use a machine-installed Node runtime visible to the task account. Configure persistent log capture/rotation with your process manager; Task Scheduler history alone is not an application log.

Task settings reference: [Microsoft ScheduledTasks settings](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasksettingsset?view=windowsserver2025-ps).

## Verification and limits

The Node configuration/launch-planning helpers have automated tests covering component isolation, runtime checks, port conflicts, secret preservation, environment generation and origin validation. Syntax, lint and TypeScript are checked in this repository. PowerShell and the actual Windows Server/Chromium startup must still be verified on a Windows host; the authoring environment is macOS.

### Script not found or MethodNotFound

Run setup from the repository directory using the `./` or `.\` prefix. The main filename is **init-windows.ps1**, with an **s**:

```powershell
cd C:\Apps\41-real-estate
.\init-windows.ps1
```

`init-window.ps1` is also included as a compatibility alias. It forwards the same component/port/start options to the main script. Copy the complete repository, including `scripts\windows\common.ps1`; the entry script is not a standalone installer.

The Node-version check accepts native command output as an array and parses its version without calling `.Trim()` on the output object. Setup/start failures now include their script filename, line number and error ID. If an error remains, share those details and the message, with credentials/API keys removed. These diagnostics distinguish a missing script command from an actual PowerShell `MethodNotFound` error.

### Node works outside the repository but fails inside it

Older checkouts pinned **20.20.2** in `.nvmrc`. A directory-aware version manager may automatically select that missing version when you enter the project, even if Node 22 works elsewhere. The current pin is **22.23.4**. To fix an older Windows checkout immediately, run these commands from its repository folder:

```powershell
Set-Content -LiteralPath .nvmrc -Value '22.23.4' -Encoding ASCII
Set-Location ..
Set-Location .\real-estate
node.exe --version
.\init-windows.ps1 -Component WhatsApp
```

The version check should print `v22.23.4`. If your version manager does not switch automatically, select/install that version with the manager you already use, then rerun setup. Do not install Node 20 to work around the stale pin: the WhatsApp service requires Node 22.x.
