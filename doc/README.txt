Table of content:
1. Using the public API
2. Cross-domain
3. Responsiveness
4. Filtering jobs
5. Internationalization (i18n)

--

1. Using the public API

If security is enabled in Jenkins, you have to grant 'anonymous' the right to read views/jobs
so that you can access the public API (even with a specific user+token having those rights).
It is a known bug in Jenkins : https://issues.jenkins-ci.org/browse/JENKINS-21005

The user name and token for the API have to be setup in the config.json file. Those values are
retrived from Jenkins after having created the user, and asked for a token.

For example:
    "authentication_user": "public_api",
    "authentication_token": "01234567890123456789012345678901"

2. Cross-domain

You need to configure cross-domain in order to use the public API of Jenkins (which the app needs) on
another domain than the one where Jenkins is hosted. You can for example use the "Secure Requester
Whitelist Plugin". If you run this app under 'localhost' on a computer, you'll have to add 'localhost'
as a trusted domain when connected to the security administration page of Jenkins.

3. Responsiveness

While this app is 'horizontally' responsive, you'll still need to setup a number of item to show per page
 in the config.json file. It will depend on the height of the screen on which you want to display the reports.

Note that this will lead the app to compute how many pages are needed to display all the jobs automatically. You
won't have to change any value once you're satisfied, even if you add/remove jobs or filters.

4. Filtering jobs

You might want to select the jobs you want to display. This is done by filtering the jobs retrieved from
the public API, using regex (see the "filters" section of config.json).

For example:
    {
          "regex": "^(build|run|deploy)",   <-- a pattern that matches job names, see JS RegExp doc
          "modifier": "i",                  <-- a modifier, see JS RegExp doc
          "keep": true                      <-- true => display the jobs, otherwise don't display the jobs
    }

5. Internationalization (i18n)

The way dates/durations are handled, using the Moment.js library, makes it easy to setup your dashboard
with the language of your choice.

You can use the 'language' configuration option in config.json to choose your language if available. This is
done using the ISO2 code of the language (in upper-case). By default, EN will be used if the code you
setup does not correspond to a language implemented in the i18n.js file.

You can also add you language in the i18n.js file by:
- adding a configuration function for Moment.js (their website offers some already implemented languages)
- adding a new entry to the i18n variable
- adding an 'if' statement for your language in the two selection functions

In current state the app is packaged with EN (by default), and FR. Note that everything that comes from
Jenkins is displayed as-is, and that you might have to setup Jenkins language to match your needs.