# MasterTracker: install and run (Linux)

MasterTracker is a dashboard for the CMM team. One Node.js program reads the
CC Master List and Letter of Award Excel files from a folder and serves both
the data and the dashboard on one port (default 4000). Excel is never changed.

## Folder layout
mastertracker/
  server/   server.js, package.json, package-lock.json
  src/, public/, package.json   (React dashboard source)
  build/    created by "npm run build"

## Install
1. Install Node.js (tested on v24.15.0).
2. Dashboard: in the project root run `npm ci` then `npm run build`.
3. Server: in `server/` run `npm ci`.
   The server looks for the build in `../build`, `../dashboard/build` or
   `./build`, or in the folder named by `DASHBOARD_BUILD`.

## Settings (environment variables)
| Name | Meaning | Default |
| --- | --- | --- |
| MASTERLIST_FOLDER | Folder that holds the CC Master List workbook and the LOA file (sub-folders are searched) | none: must be set |
| PORT | Port to listen on | 4000 |
| DASHBOARD_BUILD | Folder with the built dashboard | auto-detected |

## Run
Test: `MASTERLIST_FOLDER=/data/cmm/masterlist node server/server.js`
then open http://localhost:4000.

As a service: copy `mastertracker.service` to `/etc/systemd/system/`, edit the
user and paths, then:

    sudo systemctl daemon-reload
    sudo systemctl enable --now mastertracker

It restarts after a crash and starts after a reboot.

## Notes for IT
- Read-only on the Excel files. The server writes one file,
  `server/last-good.json`, a backup copy of the last data read; it holds tender
  data, so protect it like the Excel files.
- No sign-in is built in. Put Microsoft Entra ID sign-in in front of it (reverse proxy).
- `/api/health` and `/api/loa-debug` show folder paths and sample data; restrict them.
- The file name must contain "master" and "list" plus "cc" or "mom". Names
  containing "copy" and Excel lock files (`~$`) are ignored.
- The Excel files must reach the server's folder (network share or mounted
  folder). The OneDrive sync i used on my laptop has no official Linux version.

## MEETING WITH CIK NASIR AND CIK HAFIZIE
- to sustain this project for a longer run they will replicate it in sharepoint for both excel and the dashboard itself
