import { PkgResolver } from "./PkgResolver";
import { EventEmitter } from "events";
import { Manifest } from "pacote";
import semver from 'semver';

interface PkgSpec {
  name: string;
  version: string;
}
class MultiResolver extends EventEmitter {
  private readonly registry: string;
  private readonly connections: number;
  private specs: Array<PkgSpec> = [];
  private specsGroupMap = new Map();
  private resolvers: Array<PkgResolver> = [];
  private manifests: Array<Manifest> = [];
  private manifestWorker = new Map();
  private fileWorker = new Map();
  private manifestFetching: Promise<Array<Manifest>>;
  private fileFetching: Promise<Array<Manifest>>;
  private manifestQueuePoint: number = 0;
  private fileQueuePoint: number = 0;
  private fileDest: string;

  constructor(specs: Array<PkgSpec>, opts: { registry: string; connections: number}) {
    super();
    this.specs = specs;
    this.registry = opts.registry;
    this.connections = opts.connections;
    this.addSpecs(specs);
  }

  addSpecs(specs: Array<PkgSpec>): void {
    specs.forEach(s => {
      if (!this.specsGroupMap.has(s.name)) {
        this.specsGroupMap.set(s.name, []);
      }
      let specGroup: string[] = this.specsGroupMap.get(s.name);
      if (semver.valid(s.version)) {
        if (!specGroup.find(v => semver.eq(v, s.version))) {
          specGroup.push(s.version);
          this.specs.push(s)
        }
        return;
      }
      if (semver.validRange(s.version)) {
        // @TODO
        return;
      }
    });
  }

  async fetchManifest(): Promise<Array<Manifest>> {
    if (!this.manifestFetching) {
      this.on('_manifest', this._fetchManifest);
      this._fetchManifest();
      this.manifestFetching = new Promise((resolve, reject) => {
        this.on('manifest', (manifests) => {
          resolve(manifests);
        });
      });
    }
    return this.manifestFetching;
  }
  private _fetchManifest(): void {
    if (this.manifestWorker.size === 0 && this.manifestQueuePoint === this.specs.length) {
      this.emit('manifest', this.manifests);
      return;
    }
    let toBeResolving = this.specs.slice(this.manifestQueuePoint, this.manifestQueuePoint + (this.connections - this.manifestWorker.size));
    toBeResolving.forEach(spec => {
      let resolver = new PkgResolver(spec, this.registry);
      resolver.on('manifest', data => {
        this.manifests.push(data);
        this.addSpecs(resolver.parseDependencies());
        this.addSpecs(resolver.parseDependencies());
        this.manifestWorker.delete(spec);
        this.emit('_manifest');
      })
      resolver.fetchManifest();
      this.resolvers.push(resolver);
      this.manifestWorker.set(spec, resolver);
      this.manifestQueuePoint++;
    });
  }
  private _fetchFile(): void {
    if (this.fileWorker.size === 0 && this.fileQueuePoint === this.resolvers.length) {
      this.emit('file', this.manifests);
      return;
    }
    let toBeResolving = this.resolvers.slice(this.fileQueuePoint, this.fileQueuePoint + (this.connections - this.fileWorker.size));
    toBeResolving.forEach(resolver => {
      resolver.on('file', data => {
        this.fileWorker.delete(resolver.spec);
        this.emit('_file');
      })
      resolver.fetchFile(this.fileDest);
      this.fileWorker.set(resolver.spec, resolver);
      this.fileQueuePoint++;
    });
  }
  async fetchFile(dest: string): Promise<Array<Manifest>> {
    if (!this.fileFetching) {
      this.fileDest = dest;
      this.fileFetching = new Promise((resolve, reject) => {
        this.on('file', (manifests) => {
          resolve(manifests);
        });
      });
      this.on('_file', this._fetchFile);
      this.fetchManifest().then(() => {
        this._fetchFile();
      })
    }
    return this.fileFetching;
  }
}

export { MultiResolver };
