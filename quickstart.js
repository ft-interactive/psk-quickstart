import loudRejection from 'loud-rejection';
import {prompt} from 'inquirer';
import fs from 'fs';
import path from 'path';
import c from 'chalk';
import tildify from 'tildify';
import {spawn} from 'child_process';
import Promise from 'bluebird';
import sander from 'sander';

loudRejection();

prompt([{
  name: 'projectName',
  message: 'Where do you want to create your project? (e.g. "my-project")',
  validate: input => {
    if (!/^[0-9a-zA-Z ... ]+$/.test(input)) {
      return 'Please enter a valid filename (no weird characters)';
    }
    if (fs.existsSync(path.resolve(input))) {
      return 'Something already exists here! ' + c.cyan(tildify(path.resolve(input)));
    }
    return true;
  },
}, {
  name: 'confirmed',
  type: 'confirm',
  message: ({projectName}) => `Please confirm: ${c.cyan(tildify(path.resolve(projectName)))}`,
}], Promise.coroutine(function *({confirmed, projectName}) {
  if (!confirmed) {
    console.log('OK, exiting.');
    process.exit(0);
  }

  const projectPath = path.resolve(projectName);
  console.assert(projectPath.length);
  const projectPathRelative = path.relative(process.cwd(), projectPath);

  say(`Creating directory: ${projectPathRelative}`);
  yield sander.mkdirp(projectPath);
  tick();

  // change directory
  say(`cd'ing into directory: ${projectPathRelative}`);
  process.chdir(projectPath);
  tick();

  say(`Downloading latest project-starter-kit from Github...`);
  yield run(
    'curl -L https://github.com/ft-interactive/project-starter-kit/archive/master.zip --output psk.zip'
  );
  tick();

  say(`Unzipping...`);
  yield run('tar -zxf psk.zip --strip 1');
  tick();

  say(`Deleting unneeded files...`);
  yield Promise.all([
    sander.rimraf('docs'),
    sander.unlink('README.md'),
    sander.unlink('psk.zip'),
  ]);
  tick();

  say(`Running git init and committing the initial files...`);
  yield run('git init');
  yield run('git add .');
  yield run('git commit -m project-starter-kit');
  tick();

  say(`Running npm install for you (this might take a while)...`);
  yield run('npm install');
  tick();

  console.log(
    '\n\n' + c.green('YOUR NEXT STEPS:') +
    '\n\n' + c.blue(' > ') + c.white('cd ' + projectPathRelative) +
    '\n' + c.blue(' > ') + c.white('npm start')
  );
}));

function say(message) {
  console.log(c.magenta(`\n\n${message}`));
}

function tick() {
  console.log(c.green('✓'));
}

function run(command) {
  const [name, ...args] = command.split(' ');

  return new Promise((resolve, reject) => {
    console.log(c.blue(' > ') + command);

    const child = spawn(name, args, {
      stdio: 'inherit',
    });

    child.on('error', reject);

    child.on('close', code => {
      if (code !== 0) reject(new Error('Command failed'));
      else resolve();
    });
  });
}
