# Releasing

Tenantkit uses [Semantic Versioning](https://semver.org/) and tags releases as `vMAJOR.MINOR.PATCH`.

| Change                                                   | Version bump |
| -------------------------------------------------------- | ------------ |
| Breaking change to the content format (`schema_version`) | Major        |
| New state, letter, language or feature                   | Minor        |
| Fixes, corrected rules, translations, dependency updates | Patch        |

## Steps

1. Make sure `main` is green in CI.
2. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, add a fresh empty
   `## [Unreleased]` above it, and update the links at the bottom.
3. Bump the version without tagging yet:

   ```bash
   npm version X.Y.Z --no-git-tag-version
   ```

4. Commit and push:

   ```bash
   git commit -am "chore(release): vX.Y.Z" && git push origin main
   ```

5. Tag and push the tag:

   ```bash
   git tag -a vX.Y.Z -m "Tenantkit vX.Y.Z" && git push origin vX.Y.Z
   ```

The [Release workflow](../.github/workflows/release.yml) then:

1. runs the full CI suite on the tagged commit,
2. checks that the tag matches `package.json`,
3. builds the site with the build number set to the commit count,
4. packages `tenantkit-site-vX.Y.Z.zip`, `tenantkit-content-vX.Y.Z.zip`, a CycloneDX SBOM and
   `SHA256SUMS.txt`,
5. creates build provenance attestations for the files, and
6. publishes the GitHub release with the changelog section as notes.

Tags with a suffix, such as `v1.1.0-rc.1`, are published as pre-releases.

You can also release without pushing a tag: run the **Release** workflow from the Actions tab on
`main` and enter the tag (e.g. `v1.2.0`). If the tag doesn't exist yet, the workflow creates it on
the latest commit of `main` when it publishes the release. Running it with an existing tag
re-publishes that release (for example after fixing the workflow).

## Verifying a download

```bash
sha256sum -c SHA256SUMS.txt
```

```bash
gh attestation verify tenantkit-site-vX.Y.Z.zip --repo lobojoel2003/Tenantkit
```
