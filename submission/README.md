# Stage 2 — Scan, Remediation, and Docker Delivery

## 1. Applicable findings

I scanned the npm application in the JFrog trial using SCA and Contextual Analysis:

```bash
jf audit --npm --sca --format=sarif --server-id=jfrog-trial
```

The baseline scan identified these two applicable findings with High ratings under different severity metrics:

| CVE | Component | Default CVSS-based severity | JFrog Research severity | Contextual analysis |
| --- | --- | --- | --- | --- |
| CVE-2022-31129 / XRAY-230783 | moment 2.19.3 | High — 7.5 | Medium | Applicable |
| CVE-2018-16487 / XRAY-75300 | lodash 4.17.4 | Medium — 5.6 | High | Applicable |

Moment's issue is a regular-expression denial of service when parsing crafted date strings. Lodash's issue is prototype pollution through functions such as `merge`, `mergeWith`, and `defaultsDeep`. The severity source is stated explicitly because the two findings are High under different metrics.

The scan also reported CVE-2020-28500 in Lodash as Applicable, with a Medium default severity (5.3). It is retained in the full results.

## 2. What contextual analysis means

A raw vulnerability list tells me that an installed dependency version has a known issue. Contextual analysis examines how the application uses that dependency and whether the conditions for the particular vulnerability are present. An Applicable result means JFrog's analysis identified the relevant conditions in the scanned application.

This changes how I prioritize remediation: I consider applicability alongside severity and exposure, rather than upgrading packages solely because they appear at the top of a severity-sorted list. For example, a vulnerable date parser matters when strings reach that parser, simply importing the library or obtaining the current time is a different use case. Findings without sufficient analysis remain visible for review rather than being treated as safe.

## 3. Remediation and verification

I selected **CVE-2022-31129** and upgraded the direct dependency from **Moment 2.19.3 to 2.29.4**, the first patched version identified by the [maintainer advisory](https://github.com/moment/moment/security/advisories/GHSA-wc69-rhjr-hc9g). An upstream dependency upgrade removes the vulnerable implementation while keeping the existing Moment API calls. The included lockfile makes dependency installation repeatable.

Verification:

- All **9 API tests passed** after a clean `npm ci` install.
- A bounded library-level regression test using 500,000 opening parentheses timed out after five seconds with the original version. With 2.29.4, parsing completed in 7 ms and rejected the input. A valid RFC2822 date still parsed correctly.
- The application process served a healthy response and a successful demo login.
- The post-fix JFrog scan completed SCA and Contextual Analysis. **CVE-2022-31129 was absent**, and the applicable CVE count fell from **3 to 2**. The two Lodash findings remained.

To support clean installation and verification, I also declared the already-imported `bcrypt` and `validator` dependencies, used Node.js 22, prevented a test import from starting a permanent listener, and mocked the external HTTP dependency in the API tests.

## 4. Docker image and Build Info

I built and published the fixed Docker image using the [publishing workflow](../.github/workflows/publish-build.yml). The [successful run](https://github.com/prielK/jfrog_task/actions/runs/39698050195), attempt 2, passed the application tests, source contextual scan, and container `/health` check before pushing the image and publishing Build Info. The image runs as a non-root user and installs production dependencies from the lockfile.

| Artifact | Published value |
| --- | --- |
| Docker image | `trialj7mn0l.jfrog.io/sample-docker-local/user-management-service:dfac2a737f36-2-2` |
| Image digest | `sha256:5aff0875fce24b31450f87b5aca8f9422e17ad26aed19811b3ccfee142ae7aa4` |
| Build Info name | `jfrog-home-assignment` |
| Build Info number | [2-2](https://trialj7mn0l.jfrog.io/ui/builds/jfrog-home-assignment/2-2/1792628295140/published?buildRepo=artifactory-build-info) |
| Source commit | `dfac2a737f36ec4714742f67a5d9d1dd756ec66c` |

The workflow associates the pushed image and Git revision with the same build identity:

```bash
jf docker push "$IMAGE" --skip-login --build-name="$JFROG_CLI_BUILD_NAME" --build-number="$JFROG_CLI_BUILD_NUMBER"
jf rt build-add-git "$JFROG_CLI_BUILD_NAME" "$JFROG_CLI_BUILD_NUMBER"
jf rt build-publish "$JFROG_CLI_BUILD_NAME" "$JFROG_CLI_BUILD_NUMBER"
```

The published Build Info contains the Docker module `user-management-service:dfac2a737f36-2-2`, with 13 artifacts and the source Git revision. I verified the manifest in Artifactory and matched its SHA-256 checksum to the image digest. The [publication evidence](evidence/publication.json) records these identifiers and the successful workflow steps. The scan, container health response, and image digest are also retained as workflow artifacts.

## 5. Scan evidence

Baseline source commit: `be7a62e65001c92d52932848daca45ad4994097b`. Before/after scans were run on 2026-10-21 using JFrog CLI 2.127.0. Personal filesystem paths in the saved evidence are sanitized.

| Evidence | Before remediation | After remediation |
| --- | --- | --- |
| Full SCA and contextual results | [baseline.sarif](evidence/baseline.sarif) | [after.sarif](evidence/after.sarif) |
| Execution log | [baseline-scan-log.txt](evidence/baseline-scan-log.txt) | [after-scan-log.txt](evidence/after-scan-log.txt) |
| Finding summary | [baseline-summary.json](evidence/baseline-summary.json) | [after-summary.json](evidence/after-summary.json) |

The [original CLI output from 2026-10-20](evidence/baseline-cli-2026-10-20.txt) is also included.
