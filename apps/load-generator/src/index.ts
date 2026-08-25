import { LoadGenerator, loadPhases } from './generator/load-generator';

const generator = new LoadGenerator();

console.log('[Load Generator] Starting...');

generator.run(loadPhases);

process.on('SIGINT', () => {
    console.log('[Load Generator] Stopping...');
    generator.stop();
    process.exit(0);
});
