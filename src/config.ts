interface GlobalConfig {
  registry: string;
  connections: number;
}

const config: GlobalConfig = {
  registry: 'https://registry.npmjs.org/',
  connections: 5
}
export default config
