// Windows junctions allow the project to run when dependencies live on another drive.
import { realpathSync } from 'node:fs';
import { resolve, parse } from 'node:path';
import { spawn } from 'node:child_process';
const modules=resolve('node_modules');
const crossDrive=process.platform==='win32' && parse(realpathSync(modules)).root.toLowerCase()!==parse(modules).root.toLowerCase();
const env={...process.env};
if(crossDrive) env.NODE_OPTIONS=[env.NODE_OPTIONS,'--preserve-symlinks --preserve-symlinks-main'].filter(Boolean).join(' ');
const child=spawn(process.execPath,[resolve(modules,'next/dist/bin/next'),...process.argv.slice(2)],{stdio:'inherit',env});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
