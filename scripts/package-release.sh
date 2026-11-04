#!/usr/bin/env bash
# Package a release into dist/:
#   tenantkit-site-v<version>.zip     the static website, ready to host anywhere
#   tenantkit-content-v<version>.zip  rules, letters and schemas (CC BY 4.0) for reuse
#   tenantkit-sbom-v<version>.cdx.json  software bill of materials (CycloneDX)
#   SHA256SUMS.txt                    checksums for all of the above
set -euo pipefail

VERSION="${1:?usage: package-release.sh <version>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

test -f "$ROOT/build/index.html" || { echo "Run npm run build first" >&2; exit 1; }
rm -rf "$DIST"
mkdir -p "$DIST"

# Website
(cd "$ROOT/build" && zip -qr -X "$DIST/tenantkit-site-v$VERSION.zip" .)

# Content bundle for legal aid groups and other tools
STAGE="$(mktemp -d)"
mkdir -p "$STAGE/tenantkit-content-v$VERSION"
cp -R "$ROOT/content/." "$STAGE/tenantkit-content-v$VERSION/"
cp -R "$ROOT/schema" "$STAGE/tenantkit-content-v$VERSION/schema"
(cd "$STAGE" && zip -qr -X "$DIST/tenantkit-content-v$VERSION.zip" "tenantkit-content-v$VERSION")
rm -rf "$STAGE"

# Software bill of materials
(cd "$ROOT" && npm sbom --package-lock-only --sbom-format cyclonedx --omit dev > "$DIST/tenantkit-sbom-v$VERSION.cdx.json")

(cd "$DIST" && sha256sum ./*.zip ./*.cdx.json | sed 's# \./# #' > SHA256SUMS.txt)
ls -l "$DIST"
cat "$DIST/SHA256SUMS.txt"
