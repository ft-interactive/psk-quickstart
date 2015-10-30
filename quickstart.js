import c from 'chalk';
import loudRejection from 'loud-rejection';
import Promise from 'bluebird';
import sander from 'sander';
import {spawn} from 'child_process';

loudRejection();

Promise.coroutine(function *() {
  const files = (yield sander.readdir(process.cwd())).filter(file => file !== '.DS_Store');
  if (files.length) {
    console.log(c.red('\nThis directory is not empty!'));
    console.log('\nPlease ' + c.cyan('cd') + ' into an empty directory and try again.');
    process.exit(1);
  }

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
    '\n\n' + c.green('Now start the development server:') +
    '\n' + c.blue(' > ') + c.white('npm start')
  );
})();

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
