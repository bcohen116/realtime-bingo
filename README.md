# What does this do?
Ask me for the public URL, I'll gladly provide it. It is not listed here so it does not get spammed with bots and use up all of my data plan.
* Easily upload data for generating Bingo boards with a CSV file
* Generate Bingo boards randomly for each player
* Play Bingo in real time against other people in the "online room"
* Create rooms to invite your friends
* View the other players' Bingo boards and how close they are to winning
* Cache saving to optimize data usage as well as prevent data loss from accidentally closing the page
* Play assistance, with indicators for Bingo squares other players have clicked, but you have not
* Future plans for multiple modes like 4 corners, and "Bingo Betting" which will add more interactivity to the game

# How to install
This project uses a few resources. You'll need to install the following:
* Download this repository
* node installation https://nodejs.org/en/
* react router https://codeburst.io/getting-started-with-react-router-5c978f70df91
  * <code>npm install react-router-dom </code>
* Bootstrap for react https://react-bootstrap.github.io/getting-started/introduction/
  * <code> npm install react-bootstrap bootstrap</code>
* react csv reader https://www.npmjs.com/package/react-csv-reader
  * <code>npm i react-csv-reader</code>
* react csv writer https://www.npmjs.com/package/react-csv
  * <code>npm i react-csv </code>
* lodash https://lodash.com/
  * <code>npm i --save lodash </code>
* Firebase
  * <code>npm install --save firebase </code>
* Firebase hosting tools
  * <code>npm install -g firebase-tools </code>

## To use firebase and upload project to firebase hosting:
* Create a project in the firebase console https://console.firebase.google.com/
  * Under Project Settings -> Add a web app to the project
* In that same location, find **Firebase SDK snippet**
  * Check the **config** radio button and take note of all the info there
* In this repository there is a .env file, make a copy of that and change the name to .env.local
  * Fill in the information in the new file with the info you got from the config section earlier
* On the left hand side, go to the database tab
  * Create a **Firestore** database
    * Go into the **Rules** tab of the database and change the line <code>allow read, write: if false </code> to <code>allow read, write: if request.auth.uid != null; </code>
* On the left hand side, go to ** Authentication**
  * Go to the **Sign-in Method** tab and enable "Anonymous checkin"
* On the left side panel again, go to hosting
  * Connect your web app you configured earlier to link with the hosting
* After turning that on, open a terminal in the same location you installed all the npm libraries
  * type <code>firebase login </code> and login with your Google account
  * type <code>firebase init --project your-project-ID </code>
    * the **project id** is found in the settings page for your firebase project
  * It will prompt you to select services with the space bar
    * select only the hosting service, you dont need the others as they are taken care of online already
  * It will then prompt you for the local public directory
    * choose **build** as this is where react compiles the project
  * Enter **N** (no) for if you want to overwrite index.html
  * Enter **Y** (yes) for if you want to configure the project as a "one page app"
    * **If you do not do this, the website will not load because of how React works**
  * Make sure the project is up to date with a <code>npm run build </code>
  * Finally, do <code> firebase deploy </code> to push it live on the web

 ## To update the site:
 ### Locally
 * Save the project
 * Run <code> npm start</code>
 * The project will auto open in your default browser when it is ready
 * **In local mode, changes are pushed live immediately after you save a file in the project**

 ### Hosted on Firebase:
 * Save the project
 * Run <code>npm run build </code> to compile the project
 * Run <code>firebase deploy </code> to push the project live online
    * To remove the site from being public do <code>firebase hosting:disable </code>
      * This does not delete the host, it just takes down your link. if you deploy again it will be live again




# NPM info

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `npm run build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
