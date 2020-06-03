import React from 'react';
import logo from './logo.svg';
import './App.css';
import './bingo.css';
import {Button, Alert, Table, Modal, Spinner, OverlayTrigger , Tooltip} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link} from 'react-router-dom';
import {db} from './index';
import firebase from './index'

//This file contains the actual bingo game code


class BoardEntry {
  //This class contains the metadata to receive/send the information about bingo squares to firebase
  constructor (name, description, rarity, id){
    this.name = name;
    this.description = description;
    this.rarity = rarity;
    this.id = id;
  }
  toString(){
    return this.name + ', ' + this.description + ', ' + this.rarity + ', ' + this.id;
  }

}

//Puts raw data or data from  firebase into useable formats
var entryConverter = {
  toFirestore: function(entry) {
          return {
              name: entry.name,
              description: entry.description,
              rarity: entry.rarity,
              id: entry.id
              }
      },
  fromFirestore: function(snapshot, options){
      const data = snapshot.data(options);
      return new BoardEntry(data.name, data.description, data.rarity, data.id)
  }
}

class Bingo extends React.Component {
  //Props extracts info from the url
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      sample: '',
      room_name: decodeURIComponent(props.match.params.room_name),
      room_id: decodeURIComponent(props.match.params.room_id),
      all_entries: [],
      common_entries: [],
      uncommon_entries: [],
      rare_entries: [],
      ultra_rare_entries: [],
      user_board_entries: [],
      user_board: [],
      board_ids: [],
      boardVisible: false,
      current_board_state: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      all_board_states: [],
      all_board_ids: [],
      user_id: '',
      active: [false,false,false,false,false,false,false,false,false,false,false,
      false,false,false,false,false,false,false,false,false,false,false,false,false,false],
      active_pulse: [false,false,false,false,false,false,false,false,false,false,false,
      false,false,false,false,false,false,false,false,false,false,false,false,false,false],
      bestOdds: 0,
      mode: 'classic',
      userListener: null,
      users: [],
      users_unsorted: [],
      user_viewing: "",
      user_view_index: 0,
      game_over: false,
      winner_name: '',
      loading: false,
      view_only: false,
      victoryAudio: new Audio("/win-sound.mp3")
    };
    console.log("Room name received: " + this.state.room_name, ", ID received: " + this.state.room_id);
    this.generateBingoEntries = this.generateBingoEntries.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.addUser = this.addUser.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.checkBingo = this.checkBingo.bind(this);
    this.handleBingoWin = this.handleBingoWin.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.moveToUpload = this.moveToUpload.bind(this);
    this.getBingoEntries = this.getBingoEntries.bind(this);
    this.waitFor = this.waitFor.bind(this);
    this.checkCache = this.checkCache.bind(this);
    this.showPlayer = this.showPlayer.bind(this);
    this.inviteLink = this.inviteLink.bind(this);
  }

  waitFor(conditionFunction) {

  const poll = resolve => {
    if(conditionFunction()) resolve();
    else setTimeout(_ => poll(resolve), 400);
  }

  return new Promise(poll);
}


  getBingoEntries(){
    //Get the list of entries usable by the bingo board
    const entryRef = db.collection('rooms').doc(this.state.room_id).collection("board_entries");
    entryRef.get().then(function(querySnapshot) {
      //Loop through each document in the database which each contains info for one square of a bingo board
        querySnapshot.forEach(function(doc) {
            // doc.data() is never undefined for query doc snapshots
            var data = doc.data();
            //Store board info locally so we can query the data without using firebase quotas
            var entry = new BoardEntry(data.name,data.description,data.rarity, data.id);
            this.state.all_entries.push(entry);
            switch(entry.rarity){
              case 1:
                this.state.common_entries.push(entry);
                break;
              case 2:
                this.state.uncommon_entries.push(entry);
                break;
              case 3:
                this.state.rare_entries.push(entry);
                break;
              case 4:
                this.state.ultra_rare_entries.push(entry);
                break;
              default:
                console.log("bad rarity found :( ");
                break;
            }
        }.bind(this));

        //Save everything we just did in cache so we can reduce firebase data usage by database size amount (100 db entries is 100 data reads)
        localStorage.setItem('all_entries', JSON.stringify(this.state.all_entries));
        localStorage.setItem('common_entries', JSON.stringify(this.state.common_entries));
        localStorage.setItem('uncommon_entries', JSON.stringify(this.state.uncommon_entries));
        localStorage.setItem('rare_entries', JSON.stringify(this.state.rare_entries));
        localStorage.setItem('ultra_rare_entries', JSON.stringify(this.state.ultra_rare_entries));
        let timestamp = Date.now();
        localStorage.setItem('timestamp', timestamp);
        this.generateBingoEntries(); //Actually generate the list of entries using the reteived info from above
      }.bind(this));
  }

  checkCache(){
    //Check if the user has firebase auth (prevent trying to generate info before we have access to it which would cause no board to show up)
    console.log("Retreieved auth info: " + window._USERLOGGED);
    this.setState({loading: true},
      function(){
        this.waitFor(_ => window._USERLOGGED === 'Yes')
          .then(function() {
            console.log('User has permission now!');

            //Check the difference between the times of the last win and the last cache save
            db.collection('rooms').doc(this.state.room_id).get()
              .then(function(roomDoc) {

                if (roomDoc.data().last_win !== null && JSON.parse(""+localStorage.getItem("cache_timestamp")) !== null
                  && JSON.parse(""+localStorage.getItem("cache_timestamp")).seconds >= Math.floor(roomDoc.data().last_win.toDate().getTime() / 1000)){
                  //Found cache for the current game, use this instead of making the user have to make a new name and board.
                  console.log("used cache to reuse board");
                  if (localStorage.getItem('ultra_rare_entries') !== null && localStorage.getItem('ultra_rare_entries') !== '')
                    this.setState({ultra_rare_entries: JSON.parse(localStorage.getItem('ultra_rare_entries'))});
                  if (localStorage.getItem('common_entries') !== null && localStorage.getItem('common_entries') !== '')
                    this.setState({common_entries: JSON.parse(localStorage.getItem('common_entries'))});
                  if (localStorage.getItem('uncommon_entries') !== null && localStorage.getItem('uncommon_entries') !== '')
                    this.setState({uncommon_entries: JSON.parse(localStorage.getItem('uncommon_entries'))});
                  if (localStorage.getItem('rare_entries') !== null && localStorage.getItem('rare_entries') !== '')
                    this.setState({rare_entries: JSON.parse(localStorage.getItem('rare_entries'))});
                  if (localStorage.getItem('all_entries') !== null && localStorage.getItem('all_entries') !== '')
                    this.setState({all_entries: JSON.parse(localStorage.getItem('all_entries'))});
                  //Retreived board element info, now get the cached user board
                  this.setState({user_board: JSON.parse(localStorage.getItem("cached_board"))},
                    function(){
                      this.setState({board_ids: JSON.parse(localStorage.getItem("cached_board_ids"))},function(){
                          this.setState({value: localStorage.getItem("user_name")},function(){
                            this.setState({user_viewing: this.state.value}); //Used for displaying who's board is being looked at
                            this.setState({active: JSON.parse(localStorage.getItem("active_state"))},
                              function(){
                                this.setState({current_board_state: JSON.parse(localStorage.getItem("current_board_state"))},function(){
                                  //Wait for all of the states to be set, then do the rest
                                  this.setState({bestOdds: localStorage.getItem("best_odds")},
                                  function(){
                                    //Set listeners that normally would be created in the addUser() function (which doesnt run in this case cause we are restoring the user info)
                                    //Get realtime updates any time a player is added, or a score is updated
                                    let listener = db.collection('rooms').doc(this.state.room_id)
                                      .onSnapshot(function(doc) {
                                        var users = [];
                                            //Extract the data from firebase into one array
                                            // console.log("all users list order check: " + doc.data().player_names);
                                            doc.data().player_names.forEach(function(name, index){
                                              users.push({name: doc.data().player_names[index],
                                                          best_odds: doc.data().player_scores[index]});
                                            }.bind(this));
                                            // console.log("Check 2: " + JSON.stringify(users));
                                            var currentNames = [];
                                            var currentScores = [];
                                            var currentIds = [];
                                            var currentStates = [];
                                            currentNames = doc.data().player_names !== undefined && doc.data().player_names.length
                                              ? doc.data().player_names : [];
                                            currentScores = doc.data().player_scores !== undefined && doc.data().player_scores.length
                                              ? doc.data().player_scores : [];
                                            currentIds = doc.data().board_ids !== undefined && doc.data().board_ids.length
                                              ? JSON.parse(doc.data().board_ids) : [];
                                            currentStates = doc.data().board_states !== undefined && doc.data().board_states.length
                                              ? JSON.parse(doc.data().board_states) : [];

                                            //Check if user is viewing someone that is not themselves
                                            if (this.state.view_only){
                                              //We are viewing someone else, update the screen for that and prevent animations
                                              if (currentStates.length >= this.state.user_view_index)
                                                this.setState({active: currentStates[this.state.user_view_index]});
                                              else {
                                                console.log("Game could be getting reset, there are not enough entries in the database");
                                              }
                                            }
                                            else{
                                              //Search for bingo squares that other players have selected that this user has not yet
                                              this.state.current_board_state.forEach(function(state, index){
                                                if (state === 0){
                                                  //Found a bingo square on user's board that is unclicked, check if someone else has picked it
                                                  let idToCheck = this.state.board_ids[index];
                                                  let selectedCount = 0; //count of how many players have clicked this specific square
                                                  let i = -1;
                                                  currentIds.forEach(function(board, idx){
                                                    while ((i = board.indexOf(idToCheck, i+1)) !== -1){
                                                      //Found a board in the database (also including this user's board) that has this square.
                                                      let indexState = currentStates[idx][i]; //Whether the bingo square has been clicked or not
                                                      //Check if player has square selected
                                                      if (indexState === 1){
                                                        selectedCount++;
                                                      }
                                                    }
                                                  }.bind(this));
                                                    if (selectedCount > 1){
                                                      //At least 2 players have selected this square, now animate it to show this user they missed it
                                                      let active_pulse_temp = this.state.active_pulse;
                                                      active_pulse_temp[index] = true;
                                                      this.setState({active_pulse: active_pulse_temp});
                                                      console.log("square should animate");
                                                    }
                                                    else{
                                                      // This square probably hasnt been picked yet, turn off any animations
                                                      let active_pulse_temp = this.state.active_pulse;
                                                      active_pulse_temp[index] = false;
                                                      this.setState({active_pulse: active_pulse_temp});
                                                    }
                                                }
                                              }.bind(this));
                                            }




                                        //save the data in local variables for use later
                                        this.setState({users_unsorted: users},
                                        function(){
                                          // console.log("Check 3: " + JSON.stringify(this.state.users_unsorted));
                                          //Sort the list by the player score for display on the "leaderboard" table
                                          let usersTemp = JSON.parse(JSON.stringify(users)); //Using this because users_unsorted was getting modified by the following for some reason
                                          usersTemp.sort((a, b) => (a.best_odds > b.best_odds) ? -1 : (a.best_odds < b.best_odds) ? 1: 0); //Sorts the list by how close each user is to winning
                                          // console.log("Check 4: " + JSON.stringify(users), "Check 4 Temp: " + JSON.stringify(usersTemp));
                                          this.setState({winner_name: doc.data().winner_name})
                                          this.setState({game_over: doc.data().winner},
                                            function(){
                                              if (doc.data().winner === true){
                                                this.state.userListener(); //stop listening to users table to save data usage
                                                this.state.victoryAudio.play();
                                                console.log("play sound...");
                                                localStorage.removeItem("cache_timestamp"); //force the cache to reset next game for the user board
                                                //Don't do the rest of the actions, so the page doesnt re-render when the game has ended
                                              }
                                              else{
                                                this.setState({users : usersTemp},
                                                  function(){
                                                    //Wait for state to finish updating
                                                    this.setState({all_board_states: doc.data().board_states !== undefined ? JSON.parse(doc.data().board_states) : []});
                                                    this.setState({all_board_ids: doc.data().board_ids !== undefined ? JSON.parse(doc.data().board_ids) : []});

                                                  }.bind(this));
                                              }
                                            }.bind(this));

                                        }.bind(this));

                                        console.log("Update received from users");
                                    }.bind(this));
                                    this.setState({userListener: listener});
                                    this.setState({boardVisible: true}); //This displays the board
                                  }.bind(this));
                                }.bind(this));
                              }.bind(this));
                          }.bind(this));
                      }.bind(this));
                    }.bind(this)
                  );

                }
                else{
                  //The cache is older than the last win, which means it's for the previous game and we don't want to use it
                  console.log("Generating new board...");
                  //Now check if we cached the info for what can go on a bingo board (expires every 24h to keep the data fresh)
                  if (localStorage.getItem('timestamp') !== null && (24*60*60*1000) > Date.now() - localStorage.getItem('timestamp')){
                    if (localStorage.getItem('ultra_rare_entries') !== null && localStorage.getItem('ultra_rare_entries') !== '')
                      this.setState({ultra_rare_entries: JSON.parse(localStorage.getItem('ultra_rare_entries'))});
                    if (localStorage.getItem('common_entries') !== null && localStorage.getItem('common_entries') !== '')
                      this.setState({common_entries: JSON.parse(localStorage.getItem('common_entries'))});
                    if (localStorage.getItem('uncommon_entries') !== null && localStorage.getItem('uncommon_entries') !== '')
                      this.setState({uncommon_entries: JSON.parse(localStorage.getItem('uncommon_entries'))});
                    if (localStorage.getItem('rare_entries') !== null && localStorage.getItem('rare_entries') !== '')
                      this.setState({rare_entries: JSON.parse(localStorage.getItem('rare_entries'))});
                    if (localStorage.getItem('all_entries') !== null && localStorage.getItem('all_entries') !== '')
                      this.setState({all_entries: JSON.parse(localStorage.getItem('all_entries'))},
                      //wait for state to finish setting
                      function(){
                        this.generateBingoEntries();
                      }.bind(this)
                    );
                    console.log("saved data :)");
                  }
                  else {
                    //Cache is old or we have no cache, go out to firebase to get the updated info
                    if (localStorage.getItem('timestamp') !== null && (24*60*60*1000) <= Date.now() - localStorage.getItem('timestamp')){
                      localStorage.removeItem("all_entries");
                      localStorage.removeItem("common_entries");
                      localStorage.removeItem("uncommon_entries");
                      localStorage.removeItem("rare_entries");
                      localStorage.removeItem("ultra_rare_entries");
                      localStorage.removeItem("timestamp");
                      console.log("deleted old cache");
                    }
                    console.log("used data :(");
                    this.getBingoEntries(); //methods for asking firebase for more info
                  }
                }
                this.setState({loading: false});
              }.bind(this));
      }.bind(this));
  }.bind(this));
}

  generateBingoEntries(){
        //We have all the data, now choose which ones to use for the player bingo board
        console.log("All entries:" + this.state.all_entries, "One entry: " + this.state.all_entries[0]);
        //Retreive random entries for the user's bingo board
        var extraPicks = 0; //If the database doesnt have a rarity type, use this to compensate
        var extraFulfilled = 0;
        if (this.state.ultra_rare_entries.length > 0){
          var min = 0;
          var max = this.state.ultra_rare_entries.length;
          var rand1 = Math.floor(min + Math.random() * (max - min));
          this.state.user_board_entries.push(this.state.ultra_rare_entries[rand1]);
          // console.log("testing bounds: " + this.state.ultra_rare_entries[this.state.ultra_rare_entries.length])
        }
        else{
          //Not enough ultra rare options in the database, tell the next category to use 1 extra
          extraPicks += 1;
        }

        //Found all ultra rares, now find rares
        if (this.state.rare_entries.length > 0){
          var minRare = 0;
          var maxRare = this.state.rare_entries.length;
          var pickedRareNums = []; //Don't let the random pick the same element twice
          extraFulfilled = 0;
          //Pick 2 from this rarity
          for (var x = 0; x < (2 + extraPicks); x++){
            //Double check the extra picks aren't pushing this out of bounds
            if (this.state.rare_entries.length > x){
              var rand2 = Math.floor(minRare + Math.random() * (maxRare - minRare));
              while(pickedRareNums.includes(rand2)){
                //Keep picking new randoms until we get a unique one
                rand2 = Math.floor(minRare + Math.random() * (maxRare - minRare));
              }
              pickedRareNums.push(rand2); //Found a unique #, add it to list so we dont pick it again

              this.state.user_board_entries.push(this.state.rare_entries[rand2]);
              if (x > 1){
                //since the original takes 2 entries, anything over 2 entries is extracts
                //Mark here how many we completed so we don't double the extras
                extraFulfilled += 1;
              }
              // extraPicks -= (2 + extraPicks) - x;
            }
            else{
              //Not enough rare options in the database, tell the next category how many we didn't get to
              extraPicks += (2 + extraPicks) - (x);
              break; //need this or it will infinite loop since we're changing the for condition variable
            }
          }
          extraPicks -= extraFulfilled; //take off the extras that we already did
        }
        else{
          //Not enough rare options in the database, tell the next category to use 2 extra
          extraPicks += 2;
        }

        console.log("extras: " + extraPicks, " total length: " + this.state.user_board_entries.length);
        //Now find uncommons
        if (this.state.uncommon_entries.length > 0){
          var minUnc = 0;
          var maxUnc = this.state.uncommon_entries.length;
          var pickedUncNums = [];
          extraFulfilled = 0;
          //Pick 2 from this rarity
          for (var x2 = 0; x2 < (10 + extraPicks); x2++){
            //Double check the extra picks aren't pushing this out of bounds
            if (this.state.uncommon_entries.length > x2){
              var rand3 = Math.floor(minUnc + Math.random() * (maxUnc - minUnc));
              while(pickedUncNums.includes(rand3)){
                //Keep picking new randoms until we get a unique one
                rand3 = Math.floor(minUnc + Math.random() * (maxUnc - minUnc));
              }
              pickedUncNums.push(rand3); //Found a unique #, add it to list so we dont pick it again
              this.state.user_board_entries.push(this.state.uncommon_entries[rand3]);
              if (x2 > 9){
                //since the original takes 10 entries, anything over 10 entries is extras
                //Mark here how many we completed so we don't double the extras
                extraFulfilled += 1;
              }
            }
            else{
              //Not enough rare options in the database, tell the next category to use 1 extra
              extraPicks += (10 + extraPicks) - (x2 );
              break; //need this or it will infinite loop since we're changing the for condition variable
            }
          }
          extraPicks -= extraFulfilled; //take off the extras that we already did
        }
        else{
          //Not enough rare options in the database, tell the next category to use 10 extra
          extraPicks += 10;
        }

        // //Now find commons, last rarity, so make duplicates if we dont have enough
        if (this.state.common_entries.length > 0){
          var minCom = 0;
          var maxCom = this.state.common_entries.length;
          var pickedComNums = [];
          extraFulfilled = 0;
          //Pick 2 from this rarity
          console.log("extras: " + extraPicks, " total length: " + this.state.user_board_entries.length);
          for (var x3 = 0; x3 < (11 + extraPicks); x3++){
            console.log("for loop: " + extraPicks);
            //Double check the extra picks aren't pushing this out of bounds
            if (this.state.common_entries.length > x3){
              var rand4 = Math.floor(minCom + Math.random() * (maxCom - minCom));
              while(pickedComNums.includes(rand4)){
                //Keep picking new randoms until we get a unique one
                rand4 = Math.floor(minCom + Math.random() * (maxCom - minCom));
              }
              pickedComNums.push(rand4); //Found a unique #, add it to list so we dont pick it again
              this.state.user_board_entries.push(this.state.common_entries[rand4]);
              if (x3 > 10){
                //since the original takes 11 entries, anything over 11 entries is extras
                //Mark here how many we completed so we don't double the extras
                extraFulfilled += 1;
              }
            }
            else{
              //Check how to fill the remaining slots
              if (this.state.all_entries.length > this.state.user_board_entries.length){
                //We still have entries unused, but the board may have more rare tiles than intended
                for (var y = 0; y < this.state.all_entries.length; y++){
                  var isItUsed1 = false;
                  for (var z = 0; z < this.state.user_board_entries.length; z++){
                    if (this.state.user_board_entries[z].id === this.state.all_entries[y].id){
                      //Found a match, we already are using this one, skip it
                      isItUsed1 = true;
                      break; //found one, dont need to continue
                    }
                  }
                  if (!isItUsed1){
                    this.state.user_board_entries.push(this.state.all_entries[y]);
                    // extraPicks += (11 + extraPicks) - (x3 + 1);
                    if (x3 > 10){
                      //since the original takes 11 entries, anything over 11 entries is extras
                      //Mark here how many we completed so we don't double the extras
                      extraFulfilled += 1;
                    }
                  }
                }
              }
              else{
                //Not enough entries, duplicate some
                var rand5 = Math.floor(minCom + Math.random() * (maxCom - minCom));
                this.state.user_board_entries.push(this.state.common_entries[rand5]);
                if (x3 > 10){
                  //since the original takes 11 entries, anything over 11 entries is extras
                  //Mark here how many we completed so we don't double the extras
                  extraFulfilled += 1;
                }
              }
            }
          }
          extraPicks -= extraFulfilled; //take off the extras that we already did
          console.log("extras finished?: " + extraPicks, " total length: " + this.state.user_board_entries.length);
        }
        else{
          //Not enough common options in the database, tell the next category to use 12 extra
          extraPicks += 11;
          console.log("not enough common: " + extraPicks);
          //Check how to fill the remaining slots
          for (var x4 = 0; x4 < (11 + extraPicks); x4++){
            //There are at least 11 empty bingo squares to fill, start looking for unused ones
            if (this.state.all_entries.length > this.state.user_board_entries.length){
              //We still have entries unused, but the board may have more rare tiles than intended
              for (var y2 = 0; y2 < this.state.all_entries.length; y2++){
                var isItUsed2 = false;
                for (var z2 = 0; z2 < this.state.user_board_entries.length; z2++){
                  if (this.state.user_board_entries[z2].id === this.state.all_entries[y2].id){
                    //Found a match, we already are using this one, skip it
                    isItUsed2 = true;
                    break; //found one, dont need to continue
                  }
                }
                if (!isItUsed2){
                  this.state.user_board_entries.push(this.state.all_entries[y2]);
                }
              }
            }
            else{
              //Not enough entries, duplicate some
              maxCom = this.state.all_entries.length;
              var rand6 = Math.floor(minCom + Math.random() * (maxCom - minCom));
              this.state.user_board_entries.push(this.state.all_entries[rand6]);
            }
          }

        }
        console.log("Picked the entries: " + this.state.user_board_entries," length: " + this.state.user_board_entries.length);

        //Now randomize the order of the entries so the rarities are all mixed up on the user's board
        var minCom2 = 0;
        var maxCom2 = this.state.user_board_entries.length;
        var pickedComNums2 = [];
        for (let k = 0; k < maxCom2 + 1; k++){
          if (this.state.user_board.length === 12){
            //Insert the free space in the middle
            this.state.user_board.push(new BoardEntry("Free Space","This space is completely free!",1,this.state.all_entries.length));
            //ID guarenteed to be unique since it is created in upload.js as 0-(length-1) range of id's
            this.state.all_entries.push(this.state.user_board[this.state.user_board.length - 1]); //add it to the overall list for later
            this.state.board_ids.push(this.state.user_board[this.state.user_board.length - 1].id);//store the id for use later in the user functions
          }
          else{
            var rand7 = Math.floor(minCom2 + Math.random() * (maxCom2 - minCom2));
            while(pickedComNums2.includes(rand7)){
              //Keep picking new randoms until we get a unique one
              rand7 = Math.floor(minCom2 + Math.random() * (maxCom2 - minCom2));
            }
            pickedComNums2.push(rand7); //Found a unique #, add it to list so we dont pick it again
            this.state.user_board.push(this.state.user_board_entries[rand7]);
            this.state.board_ids.push(this.state.user_board[this.state.user_board.length - 1].id);//store the id for later in the user functions
          }
        }
        // Bingo board generated, cache will be saved of this when the user enters their name

        console.log("Created the board: " + this.state.user_board, " length: " + this.state.user_board.length);
        this.setState({sample: "something"}); //random value change to tell react to re-render the page with our new stuff


  }

  componentDidMount(){
    //This method runs when the page is configured by react.
    //This helps to avoid spamming firebase with requests while the page is loading
    console.log("Page mounted...");
    this.checkCache();
  }
  componentWillUnmount(){
    console.log("Page unmounting...");
    this.state.userListener();//unsubscribe from the firestore listener to avoid calling data after the page is destroyed
  }

  addUser(){
    //Once a name is typed in, make an entry in firebase for their information
    console.log(this.state.value,this.state.current_board_state,this.state.user_board);
    this.setState({user_viewing: this.state.value});
    //const userCollection = db.collection('rooms').doc(this.state.room_id).collection("users");

        //Get the current player list so we don't overwrite it
        var currentNames = [];
        var currentScores = [];
        var currentIds = [];
        var currentStates = [];
        db.collection('rooms').doc(this.state.room_id).get()
          .then(function(doc){
            currentNames = doc.data().player_names !== undefined && doc.data().player_names.length
              ? doc.data().player_names : [];
            currentScores = doc.data().player_scores !== undefined && doc.data().player_scores.length
              ? doc.data().player_scores : [];
            currentIds = doc.data().board_ids !== undefined && doc.data().board_ids.length
              ? JSON.parse(doc.data().board_ids) : [];
            currentStates = doc.data().board_states !== undefined && doc.data().board_states.length
              ? JSON.parse(doc.data().board_states) : [];

            //Add the new user we just made to a temporary array
            currentNames.push(this.state.value.trim());
            currentScores.push(0);
            currentIds.push(this.state.board_ids);
            currentStates.push(this.state.current_board_state);


            if (JSON.stringify(currentNames).length + JSON.stringify(currentScores).length
              + JSON.stringify(currentIds).length + JSON.stringify(currentStates).length > 1000000){
              //Firestore documents are limited to 1,048,487 bytes of data, we should never hit this unless the room has hundreds of users at once
              currentNames.pop();
              currentScores.pop();
              currentIds.pop();
              currentStates.pop();
              console.log("Too much data in this document... Preventing new user from being added");
            }
            else{
              //Send the temporary array to the database so everything is now up to date
              //Also reset winner so that if someone previously won, a new game will start
              db.collection('rooms').doc(this.state.room_id).update({
                winner: false,
                winner_name: '',
                player_names: currentNames,
                player_scores: currentScores,
                board_ids: ""+JSON.stringify(currentIds),
                board_states: ""+JSON.stringify(currentStates)
              }).then(function(){
                //Get realtime updates any time a player is added, or a score is updated
                let listener = db.collection('rooms').doc(this.state.room_id)
                  .onSnapshot(function(doc) {
                    var users = [];
                        //Extract the data from firebase into one array
                        doc.data().player_names.forEach(function(name, index){
                          users.push({name: doc.data().player_names[index],
                                      best_odds: doc.data().player_scores[index]});
                        }.bind(this));

                    //Reset the local variables since they have have changed from the listener data
                    currentNames = doc.data().player_names !== undefined && doc.data().player_names.length
                      ? doc.data().player_names : [];
                    currentScores = doc.data().player_scores !== undefined && doc.data().player_scores.length
                      ? doc.data().player_scores : [];
                    currentIds = doc.data().board_ids !== undefined && doc.data().board_ids.length
                      ? JSON.parse(doc.data().board_ids) : [];
                    currentStates = doc.data().board_states !== undefined && doc.data().board_states.length
                      ? JSON.parse(doc.data().board_states) : [];


                    //Check if user is viewing someone that is not themselves
                    if (this.state.view_only){
                      //We are viewing someone else, update the screen for that and prevent animations
                      if (currentStates.length >= this.state.user_view_index)
                        this.setState({active: currentStates[this.state.user_view_index]});
                      else {
                        console.log("Game could be getting reset, there are not enough entries in the database");
                      }
                    }
                    else{
                      //Search for bingo squares that other players have selected that this user has not yet
                      this.state.current_board_state.forEach(function(state, index){
                        if (state === 0){
                          //Found a bingo square on user's board that is unclicked, check if someone else has picked it
                          let idToCheck = this.state.board_ids[index];
                          let selectedCount = 0; //count of how many players have clicked this specific square
                          let i = -1;
                          currentIds.forEach(function(board, idx){
                            while ((i = board.indexOf(idToCheck, i+1)) !== -1){
                              //Found a board in the database (also including this user's board) that has this square.
                              let indexState = currentStates[idx][i]; //Whether the bingo square has been clicked or not
                              //Check if player has square selected
                              if (indexState === 1){
                                selectedCount++;
                              }
                            }
                          }.bind(this));
                            if (selectedCount > 1){
                              //At least 2 players have selected this square, now animate it to show this user they missed it
                              let active_pulse_temp = this.state.active_pulse;
                              active_pulse_temp[index] = true;
                              this.setState({active_pulse: active_pulse_temp});
                            }
                            else{
                              // This square probably hasnt been picked yet, turn off any animations
                              let active_pulse_temp = this.state.active_pulse;
                              active_pulse_temp[index] = false;
                              this.setState({active_pulse: active_pulse_temp});
                            }
                        }
                      }.bind(this));
                    }

                    //save the data in local variables for use later
                    this.setState({users_unsorted: users},
                    function(){
                      //Sort the list by the player score for display on the "leaderboard" table
                      let usersTemp = JSON.parse(JSON.stringify(users)); //Using this because users_unsorted was getting modified by the following for some reason
                      usersTemp.sort((a, b) => (a.best_odds > b.best_odds) ? -1 : (a.best_odds < b.best_odds) ? 1: 0); //Sorts the list by how close each user is to winning
                      this.setState({winner_name: doc.data().winner_name})
                      this.setState({game_over: doc.data().winner},
                        function(){
                          if (doc.data().winner === true){
                            this.state.userListener(); //stop listening to users table to save data usage
                            this.state.victoryAudio.play();
                            console.log("play sound...");
                            localStorage.removeItem("cache_timestamp"); //force the cache to reset next game for the user board
                            //Don't do the rest of the actions, so the page doesnt re-render when the game has ended
                          }
                          else{
                            this.setState({users : usersTemp},
                              function(){
                                //Wait for state to finish updating
                                this.setState({all_board_states: JSON.parse(doc.data().board_states)});
                                this.setState({all_board_ids: doc.data().board_ids !== undefined ? JSON.parse(doc.data().board_ids) : []});
                              }.bind(this));
                          }
                        }.bind(this));

                    }.bind(this));

                    console.log("Update received from users");
                }.bind(this));
                this.setState({userListener: listener});
                this.setState({loading: false});

                this.setState({boardVisible: true}); //This displays the board, and prevents the user from instantly winning
              }.bind(this)).catch(function(error){
                // The document probably doesn't exist.
                console.error("Error updating document: ", error);
              });
            }

          }.bind(this))
          .catch(function(error) {
              console.log("Error getting document:", error);
          });


  }

  handleChange(event) {
    //Every time a new character is typed the variable gets updated
    this.setState({value: event.target.value});
  }

  handleSubmit(event) {
    //Enter was pressed or submit btn clicked. Decide what to do now
    event.preventDefault();
    console.log("form submitted...");
    this.setState({loading: true},function(){
      //wait for state to be set
      var userName = '';
      if (this.state.value.trim() === '' || this.state.value.trim() === null){
        //The entered text was empty or only spaces
        this.setState({alertVisible: true});
        this.setState({alertText: "Field cannot be left blank."});
        this.setState({loading: false});
      }
      else if (this.state.value.trim().length > 30){
        //Prevent people from abusing the database with extra long strings
        this.setState({alertVisible: true});
        this.setState({alertText: "Name is too long."});
        this.setState({loading: false});
      }
      else{
        //Get all of the users in this room
        userName = this.state.value.trim();
        const userRef = db.collection('rooms').doc(this.state.room_id);
        var currentNames = [];
        var currentScores = [];
        console.log("about to search for users");
        db.collection('rooms').doc(this.state.room_id).get()
          .then(function(doc){
            currentNames = doc.data().player_names;
            currentScores = doc.data().player_scores;

            console.log("got users" + currentNames, " input: " + userName);
            // console.log(currentNames.includes("" + userName));
            var userFound = false;
            currentNames.forEach(function(name, index){
              if (name === userName){
                userFound = true;
              }
            }.bind(this));
            //Check if name already exists
            if (!userFound){
              //Username is not taken, move forward
              console.log("User allowed");
              localStorage.setItem("user_name", userName);
              localStorage.setItem("active_state",JSON.stringify(this.state.active));
              localStorage.setItem("cached_board", JSON.stringify(this.state.user_board));
              localStorage.setItem("cached_board_ids", JSON.stringify(this.state.board_ids));
              localStorage.setItem("cache_timestamp", JSON.stringify(firebase.firestore.Timestamp.now()));
              this.addUser();
            }
            else{
              this.setState({alertVisible: true});
              this.setState({alertText: "Name is already taken in this current room."});
              this.setState({loading: false});
            }

        }.bind(this));
      }

    }.bind(this));
  }

  checkBingo(){
    var maxOdds = 0;
    if (this.state.mode === 'classic'){
      //default mode, 5 in a line to win

      //check rows
      for (let row = 0; row < 5; row++){
        let odds = 0;
        for (let item = 0; item < 5; item++){
          if (this.state.current_board_state[(5*row)+item] === 1){
            odds += 1;
          }
        }
        maxOdds = Math.max(odds, maxOdds);
      }
      //Check columns
      for (let column = 0; column < 5; column++){
        let odds = 0;
        for (let item = 0; item < 5; item++){
          if (this.state.current_board_state[column+(item*5)] === 1){
            odds += 1;
          }
        }
        maxOdds = Math.max(odds, maxOdds);
      }
      //Check diagonals
      let diagonal1Odds = 0;
      for (let item = 0; item < 5; item++){
        if (this.state.current_board_state[item*6] === 1){
          diagonal1Odds += 1;
        }
      }
      maxOdds = Math.max(diagonal1Odds, maxOdds);
      let diagonal2Odds = 0;
      for (let item = 0; item < 5; item++){
        if (this.state.current_board_state[(item+1) * 4] === 1){
          diagonal2Odds += 1;
        }
      }
      maxOdds = Math.max(diagonal2Odds, maxOdds);

      localStorage.setItem("best_odds",maxOdds);
      this.setState({bestOdds : maxOdds},
        function(){
          //SetState completed

          //Get the current scores of all players so we don't ruin any data by updating
          var currentNames = [];
          var currentScores = [];
          var currentStates = [];
          db.collection('rooms').doc(this.state.room_id).get()
            .then(function(doc){
              currentNames = doc.data().player_names;
              currentScores = doc.data().player_scores;
              currentStates = JSON.parse(doc.data().board_states);

              currentNames.forEach(function(name, index){
                if (name === this.state.value.trim()){
                  //Update the player scores with the new value
                  currentScores[index] = this.state.bestOdds;
                  currentStates[index] = this.state.current_board_state;
                }
              }.bind(this));

              //Update the room document which is being listened to by the realtime listener
              //By updating this, the realtime listener only needs to read one document, instead of (# of users) * document
              db.collection('rooms').doc(this.state.room_id).update({
                player_scores: currentScores,
                board_states: ""+JSON.stringify(currentStates)
              }).then(function(){
                // console.log("Winner successfully updated!");
              }).catch(function(error){
                // The document probably doesn't exist.
                console.error("Error updating document: ", error);
              });

            }.bind(this))
            .catch(function(error) {
                console.log("Error getting document:", error);
            });



        }
      );//5 in a line = win, this number is how many currently in line that is closest to winning on this board


      if (maxOdds >= 5){
        //This board has Bingo!
        console.log("Bingo!");

      }
    }
  }

  showPlayer(event){
    //This runs when a cell on the "users" table is clicked, we want to show them the board of the player they clicked
    console.log("Clicked Cell, event: " + event.target.innerText);
    if (this.state.user_viewing === event.target.innerText){
      //We are already viewing this user, do nothing
    }
    else{
      // console.log("unsorted users: " + JSON.stringify(this.state.users_unsorted));
      let userMap = [];
      this.state.users_unsorted.forEach(function(user, index){
        userMap.push(user.name);
      }.bind(this));
      // let userMap = this.state.users_unsorted.map(user => user.name); //get the list of users
      let userExists = userMap.includes(event.target.innerText); //get the index of the user that got clicked
      if (userExists){
        //Name was found in the database, retreive board data for this user
        let index = userMap.indexOf(event.target.innerText);
        // console.log("Users list: " + userMap);
        // console.log("unsorted users2: " + JSON.stringify(this.state.users_unsorted));
        // console.log("User index: " + index);
        let playerBoardIds = this.state.all_board_ids[index];
        let playerBoard = [];
        for (let x = 0; x < playerBoardIds.length; x++){
          //Retreive the data for each square of the user's bingo board
          // let dataIndex = entryIdMap.indexOf(playerBoardIds[x]);
          let dataIndex = null;
          for (let y = 0; y < this.state.all_entries.length; y++){
            if (this.state.all_entries[y].id === playerBoardIds[x]){
              dataIndex = y;
              break;
            }
            else if (playerBoardIds[x] === this.state.all_entries.length){
              //This is the free space
              dataIndex = -2;
            }
          }
          if (dataIndex !== null){
            if (dataIndex == -2){
              //Add Free space
              playerBoard.push(new BoardEntry("Free Space","This space is completely free!",1,this.state.all_entries.length));
            }
            else{
              playerBoard.push(this.state.all_entries[dataIndex]);
            }

          }
          else{
            console.log("This should never happen, player's board has an ID that is not in the list of possible bingo squares");
          }
        }
        //Update the UI with the clicked player's board
        this.setState({user_board: playerBoard});
        this.setState({active: this.state.all_board_states[index]});
        this.setState({user_view_index: index});
        this.setState({user_viewing: event.target.innerText});
        if (this.state.value === event.target.innerText){
          //This is the main user, allow for edits of page
          this.setState({view_only: false});
        }
        else{
          //render invisible div so people cant click things on other players' boards
          this.setState({view_only: true});
          this.setState({active_pulse: [false,false,false,false,false,false,false,false,false,false,false,
          false,false,false,false,false,false,false,false,false,false,false,false,false,false]});//turn off animations
        }
      }
      else{
        console.log("Can't view: " + event.target.innerText + " user's board. Somehow the user is not in the database. This shouldn't be able to happen.");
      }
    }
  }

  inviteLink(){
    // To let others join, simply provide this link: {window.location.href}
    var textToCopy = "" + window.location.href;
    //clipboard command requires a textarea so we make a temporary one
    var textArea = document.createElement("textarea");
    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999); /*For mobile devices*/
    document.execCommand("Copy");//Copy the link to this page to the clipboard
    textArea.remove(); //Copied the text so remove the temporary textarea we no longer need
    console.log("This window's link copied to clipboard");
  }

  handleClose(){
    //Generate new board and take player to name screen
    window.location.reload(false);
  }


  handleClick(event, buttonId){
    //When one of the bingo squares is clicked, toggle the appearance to reflect you selected or deselected
    event.preventDefault();
    var tempState = this.state.active;
    tempState[buttonId] = !tempState[buttonId];
    this.setState({active : tempState},
      function(){
        //Wait for state to finish setting
        localStorage.setItem("active_state",JSON.stringify(this.state.active));
        //Update arrays with current player board selections
        var tempBoard = this.state.current_board_state;
        tempBoard[buttonId] = this.state.active[buttonId] ? 1 : 0;
        this.setState({current_board_state: tempBoard});
        localStorage.setItem("current_board_state",JSON.stringify(tempBoard));
        // console.log("board state: " + this.state.current_board_state);
        let active_pulse_temp = this.state.active_pulse;
        active_pulse_temp[buttonId] = false; //Turn off any animations previously on
        this.setState({active_pulse: active_pulse_temp});

        //Check if this is a winning move, or how close it is to winning
        this.checkBingo();
      }.bind(this));




  }

  handleBingoWin(event){
    //Bingo btn was pressed, you win!
    console.log("You got Bingo!");
    this.state.userListener(); //stop listening to users table to save data usage
    this.state.victoryAudio.play();
    console.log("play sound...");


    db.collection('rooms').doc(this.state.room_id).update({
      winner: true,
      winner_name: this.state.value.trim(),
      player_names: [],
      player_scores: [],
      board_ids: [],
      board_states: [],
      last_win: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){
      this.setState({game_over: true})
      this.setState({winner_name: this.state.value.trim()})
      localStorage.removeItem("cache_timestamp"); //force the cache to reset next game for the user board
    }.bind(this)).catch(function(error){
      // The document probably doesn't exist.
      console.error("Error updating document: ", error);
    });
  }

  moveToUpload(){
    let url = window.location.origin + "/upload/" + encodeURIComponent(this.state.room_name);
    window.open(url, '_blank');
  }
  render() {
    const boardItems = this.state.user_board.map((entry,id) => (
      <Button key={id} className="bingoSquare" variant="outline-primary">
      <p className="entryName">{entry.name}</p>
      <p className="entryDescription">{entry.description}</p>
      </Button>
    ));

    //Variables for tooltips
    const tooltip = (
      <Tooltip id="overlay-example">
        URL copied to clipboard
      </Tooltip>
    );
    // console.log("rendered page");
    return(
      <div className="App">
        <header className="App-header">Real-Time Bingo Online <p className="subtitle">Welcome to: {this.state.room_name}</p>
          <OverlayTrigger  trigger="click" placement="bottom" overlay={tooltip}>
            <a className="inviteLink" onClick={this.inviteLink}>Invite Others</a>
         </OverlayTrigger >
        </header>
        <div className="cover-container" style={{visibility: (this.state.loading ? "visible" : "hidden")}}><Spinner className="loadingSpinner" animation="border" variant="danger" /> <p style={{color:"white"}}>Loading... please wait :)</p></div>
        <div className="mainPage">
          {this.state.boardVisible &&
            (<div className="boardWrapper">
            <p className="boardHeader">Viewing <span className="boardHeaderName">{this.state.user_viewing}</span>'s Board</p>
            <div className="cover-container" style={{visibility: (this.state.view_only ? "visible" : "hidden")}}>
            </div>
            <div className="bingoBoard">
            {this.state.user_board.map((entry,id) =>
              <Button key={id} className={"bingoSquare " + (this.state.active[id] ? "active" : "normal") + " " + (this.state.active_pulse[id] ? "pulsate" : "normal")
                  } onClick={((e) => this.handleClick(e, id))} variant={(entry.rarity === 4) ? "outline-dark" : (entry.rarity === 3)
                      ? "outline-warning" : (entry.rarity === 2) ? "outline-success" : "outline-primary"}>
              <p className="entryName">{entry.name}</p>
              <p className="entryDescription">{entry.description}</p>
              </Button>
            )}
            {this.state.bestOdds >= 5 && (<Button className="bingoWinBtn" variant="outline-danger" onClick={this.handleBingoWin}>Bingo!</Button>)}
          </div></div>)}

          {!this.state.boardVisible && (<form onSubmit={this.handleSubmit}>
            <div className="nameCreation">
              {this.state.alertVisible && (<Alert variant="danger">{this.state.alertText}</Alert>)}
              {!this.state.alertVisible && (<Alert variant="danger" style={{visibility:"hidden"}}>{this.state.alertText}</Alert>)}
              <input className="createInput" required type="text" value={this.state.value} onChange={this.handleChange} placeholder="Enter your Name" />
              <Button className="createBtn" variant="outline-success" type="submit" >Enter Name</Button>{' '}
            </div>
          </form>)}
          {this.state.boardVisible && (<div className="playerList">
            <p style={{color: "white"}}>Bingo Betting and mode voting coming soon&trade;</p>
            <Table striped bordered hover variant="dark" >
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {this.state.users.map((user,id) =>
                  <tr key={id}>
                    <td>{user.best_odds}</td>
                    <td onClick={e => this.showPlayer(e)}>{user.name}</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>)}
        </div>
        <Button className="uploadBtn" style={{visibility: "hidden"}} variant="secondary" onClick={this.moveToUpload}>
          Upload Bingo Data
        </Button>
        <Modal show={this.state.game_over} onHide={this.handleClose} animation={false} centered>
        <Modal.Header closeButton>
          <Modal.Title>{this.state.winner_name} Wins!</Modal.Title>
        </Modal.Header>
        <Modal.Body>Thanks for playing! A new game will start when someone enters a new user name.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      </div>
    );
  }
}

export default Bingo;
