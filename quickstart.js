import c from 'chalk';
import loudRejection from 'loud-rejection';
import Promise from 'bluebird';
import sander from 'sander';
import {spawn, execSync} from 'child_process';

loudRejection();

Promise.coroutine(function *() {
  const files = yield sander.readdir(process.cwd());
  const hasGit = (files.indexOf('.git') > -1);

  // the directory must be more or less empty, otherwise we exit
  // (to avoid the common mistake of trying to scaffold in the home directory,
  // or ending up with a frankenstein app)
  if (files.filter(file => file !== '.DS_Store' && file !== '.git').length) {
    console.log(c.red('\nThis directory is not empty!'));
    console.log('\nPlease ' + c.cyan('cd') + ' into an empty directory and try again.');
    process.exit(1);
  }

  // if the directory is already git-managed, that is ok providing there are no
  // uncommitted changes (this covers the scenario where user has deleted all
  // existing files from an existing project in order to do a 'fresh start'
  // with the starter kit while retaining history)
  if (hasGit) {
    say(`This is alreay a git-managed directory; verifying working directory is clean...`);

    try {
      execSync('git diff --exit-code');
    }
    catch (error) {
      console.log(c.red(`\nWorking directory is not clean.`));
      console.log('Please commit your changes then try running this script again.');
      process.exit(1);
    }
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

  say(`Committing initial files...`);
  if (!hasGit) yield run('git init');
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
