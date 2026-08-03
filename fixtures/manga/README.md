# Manga parser fixtures

Optional saved HTML fixtures for provider parser regression tests.

Expected structure:

```txt
fixtures/manga/komiku/detail.html
fixtures/manga/komiku/reader.html
```

Run:

```bash
npm run test:manga:fixtures
```

If fixture files are missing, the test reports them as skipped so CI/build is not blocked.
