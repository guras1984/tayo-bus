declare namespace Cloudflare {
  interface Env {
    TAGO_SERVICE_KEY?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
