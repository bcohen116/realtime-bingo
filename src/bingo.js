import React from 'react';
import logo from './logo.svg';
import './App.css';
import './bingo.css';
import {Button, Alert} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
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
              rarity: entry.rarity
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
      room_name: decodeURIComponent(props.match.params.room_name),
      room_id: decodeURIComponent(props.match.params.room_id),
      all_entries: [],
      common_entries: [],
      uncommon_entries: [],
      rare_entries: [],
      ultra_rare_entries: [],
      user_board_entries: [],
      user_board: []
    };
    console.log("Room name received: " + this.state.room_name, ", ID received: " + this.state.room_id);
    this.generateBingoEntries = this.generateBingoEntries.bind(this);
  }

  generateBingoEntries(){
    //Check if the user has a previous board stored in their cache
    //TODO


    //Generate a list of entries to populate the bingo board
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
          console.log("spot 1");
          var minRare = 0;
          var maxRare = this.state.rare_entries.length;
          var pickedRareNums = []; //Don't let the random pick the same element twice
          extraFulfilled = 0;
          //Pick 2 from this rarity
          for (var x = 0; x < (2 + extraPicks); x++){
            //Double check the extra picks aren't pushing this out of bounds
            console.log("spot 2");
            if (this.state.rare_entries.length > x){
              console.log("spot 3");
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
              console.log("spot 4");
              extraPicks += (2 + extraPicks) - x;
              break; //need this or it will infinite loop since we're changing the for condition variable
            }
          }
          console.log("spot 5");
          extraPicks -= extraFulfilled; //take off the extras that we already did
        }
        else{
          //Not enough rare options in the database, tell the next category to use 2 extra
          console.log("spot 6");
          extraPicks += 2;
        }

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
              extraPicks += (10 + extraPicks) - x2;
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
          for (var x3 = 0; x3 < (11 + extraPicks); x3++){
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
                  }
                }
              }
              else{
                //Not enough entries, duplicate some
                var rand5 = Math.floor(minCom + Math.random() * (maxCom - minCom));
                this.state.user_board_entries.push(this.state.common_entries[rand5]);
              }
            }
          }
          extraPicks -= extraFulfilled; //take off the extras that we already did
        }
        else{
          //Not enough rare options in the database, tell the next category to use 11 extra
          extraPicks += 11;
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
        this.state.user_board_entries.forEach(function(entry) {
          if (this.state.user_board.length === 12){
            //Insert the free space in the middle
            this.state.user_board.push(new BoardEntry("Free Space","This space is completely free!",1,this.state.all_entries.length));
            //ID guarenteed to be unique since it is created in upload.js as 0-(length-1) range of id's
            this.state.all_entries.push(this.state.user_board[this.state.user_board.length - 1]); //add it to the overall list for later
          }
          else{
            var rand7 = Math.floor(minCom2 + Math.random() * (maxCom2 - minCom2));
            while(pickedComNums2.includes(rand7)){
              //Keep picking new randoms until we get a unique one
              rand7 = Math.floor(minCom2 + Math.random() * (maxCom2 - minCom2));
            }
            pickedComNums2.push(rand7); //Found a unique #, add it to list so we dont pick it again
            this.state.user_board.push(this.state.user_board_entries[rand7]);
          }
        }.bind(this));
        console.log("Created the board: " + this.state.user_board);

    }.bind(this));
  }

  componentDidMount(){
    //This method runs when the page is configured by react.
    //This helps to avoid spamming firebase with requests while the page is loading
    console.log("Page mounted...");
    this.generateBingoEntries();
  }

  render() {
    return(
      <div className="App">
        <header className="App-header">Real-Time Bingo Online</header>
        <div className="bingoBoard">
          {[new BoardEntry("thing name","the description",7,0)].map((entry,id) => (
            <Button key={id} className="bingoSquare" variant="outline-primary">
            <p className="entryName">{entry.name}</p>
            <p className="entryDescription">{entry.description}</p>
            </Button>
          ))}
        </div>

      </div>
    );
  }
}


export default Bingo;
