# How to become a contributor and submit your own code

1.  Submit an issue describing your proposed change to the repo in question.
1.  The repo owner will respond to your issue promptly.
1.  Fork the desired repo, develop and test your code changes.
1.  Ensure that your code adheres to the existing style in the code to which
    you are contributing.
1.  Ensure that your code has an appropriate set of tests which all pass.
1.  Title your pull request following [Conventional Commits](https://www.conventionalcommits.org/) styling.
1.  Submit a pull request.

## Running the tests

1.  Install dependencies:

        npm i
1.  Run lint

        npm run lint
        npm run format  # will fix some issues

1.  Run the tests:

        # Run unit tests.
        npm test

1.  Run the browser tests against the built examples:

        # Once, to download the browser.
        npx playwright install chromium

        # Offline tests only: the examples index, and the error each example
        # shows when the Maps JavaScript API can't load.
        npm run test:e2e

        # All tests, including those that load the examples against the live
        # Maps JavaScript API. Use a key that allows http://127.0.0.1.
        GOOGLE_MAPS_API_KEY=YOUR_API_KEY npm run test:e2e

    The examples are served on port 8090; set `E2E_PORT` to use another.
