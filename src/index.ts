// import packageJson from '../package.json';
import { Command } from 'commander';
import { PackCommand } from './commands/PackCommand';
import { ResolveCommand } from './commands/ResolveCommand';

const program = new Command();

program
  // .version(packageJson.version)
  .usage('command [options]')

program
  .command('resolve [schema]')
  .option('--json', 'Show information in JSON format')
  .option('--prod', 'Display the packages in dependencies')
  .option('--dev', 'Display the packages in devDenpendencies')
  .option('--connections [number]', 'Connection number for feching data from registry')
  .option('--depth [number]', 'Max depth of the dependency tree')
  .action(new ResolveCommand().exec)

program
  .command('pack [schema]')
  .option('--prod', 'Download the packages in dependencies')
  .option('--dev', 'Download the packages in devDependencies')
  .option('--connections [number]', 'Connection number for feching data from registry')
  .option('--out-dir [directory]', 'The directory to store the tarballs, default is current directory')
  .option('--depth [number]', 'Max depth of the dependency tree')
  .action(new PackCommand().exec)

program.parse(process.argv);
