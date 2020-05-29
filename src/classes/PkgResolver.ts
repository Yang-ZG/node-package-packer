import pacote from 'pacote'
import { EventEmitter } from 'events';

interface PkgSpec {
  name: string;
  version: string;
}
class PkgResolver extends EventEmitter {
  public readonly spec: PkgSpec;
  private readonly specName: string;
  private readonly registry: string;
  private manifestFetch: Promise<pacote.Manifest>;
  private tarballFileFetch: Promise<pacote.FetchResult>;
  private manifestInfo: pacote.Manifest;
  private manifestFetching: Promise<pacote.Manifest>;
  private fileFetching: Promise<pacote.FetchResult>;
  constructor(spec: PkgSpec, registry: string) {
    super();
    this.spec = spec;
    this.specName = this.spec.name + '@' + this.spec.version;
    this.registry = registry;
  }

  public async fetchManifest(): Promise<pacote.Manifest> {
    if (!this.manifestFetching) {
      this.manifestFetching = new Promise((resolve, reject) => {
        pacote.manifest(this.specName, {
          registry: this.registry
        }).then(data => {
          this.manifestInfo = data;
          this.emit('manifest', data);
          resolve(data);
        }).catch(e => {
          this.emit('error', e);
          reject(e);
        });
      })
    }
    return this.manifestFetching;
  }

  public async fetchFile(dest: string): Promise<pacote.FetchResult> {
    if (!this.fileFetching) {
      this.fileFetching = new Promise((resolve, reject) => {
        pacote.tarball.file(this.specName, dest, {
          registry: this.registry
        }).then(data => {
          this.emit('file', data);
          resolve(data);
        }).catch(e => {
          this.emit('error', e);
          reject(e);
        });
      });
    }
    return this.fileFetching
  }

  private _parseDependencies(dependencies: Record<string, string>): Array<PkgSpec> {
    let specs: Array<PkgSpec> = [];
    let names: Array<string> = Object.keys(dependencies);
    names.forEach(name => {
      specs.push({ name, version: dependencies[name] });
    });
    return specs;
  }

  public parseDependencies(): Array<PkgSpec> {
    return this._parseDependencies(this.manifestInfo.dependencies || {});
  }

  public parseDevdependencies(): Array<PkgSpec> {
    return this._parseDependencies(this.manifestInfo.devDependencies || {});
  }
}

export { PkgResolver };
