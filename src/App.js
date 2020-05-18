import React from 'react';
import { Router, Route} from 'react-router-dom';
import './App.css';
import {Button, Alert} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import {db} from './index';
import firebase from './index'
import Upload from './upload'
import history from './history';

//Takes info from the form and stores it in firebase accordingly
class NameForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      alertVisible: false,
      alertText: "Placeholder Alert",
      docValid: true
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    //Every time a new character is typed the variable gets updated
    this.setState({value: event.target.value});
  }

  handleSubmit(event) {
    //Enter was pressed or submit btn clicked. Decide what to do now
    event.preventDefault();
    console.log("form submitted...");
    var nextUrl = "/upload/" + encodeURIComponent(this.state.value.trim());
    if (this.state.value.trim() === '' || this.state.value.trim() === null){
      //The entered text was empty or only spaces
      this.setState({alertVisible: true});
      this.setState({alertText: "Field cannot be left blank."});
    }
    else if (this.state.value.trim().length > 30){
      //Prevent people from abusing the database with extra long strings
      this.setState({alertVisible: true});
      this.setState({alertText: "Name is too long."});
    }
    else {
      //Error check the input for bad characters for a url
      try{
        var decoded = decodeURIComponent(this.state.value.trim());
        if (decoded !== this.state.value.trim()){
          console.log("User input a string that is invalid for a url, values got lost in decode.");
          this.setState({alertVisible: true});
          this.setState({alertText: "Use less special characters."});
          this.setState({docValid: false}); // Bad string, lock data from being sent to database
        }
      }
      catch{
        console.log("User input a string that is invalid for a url");
        this.setState({alertVisible: true});
        this.setState({alertText: "Use less special characters."});
        this.setState({docValid: false}); // Bad string, lock data from being sent to database
      }

      const roomRef = db.collection('rooms');
      //Query the database for rooms that already exist with the inputted name
      roomRef.where("room_name", "==", this.state.value.trim())
        .get()
        .then(function(querySnapshot){
          //Response received from firebase
          querySnapshot.forEach(function(doc){
            //doc.data will never be null for queries
            console.log("Found a match looking for room names in document ", doc.id, " ", doc.data());
            this.setState({alertVisible: true});
            this.setState({alertText: "This room already exists, make a more unique name"});
            this.setState({docValid: false}); // Already have this name, block data from being sent to database
          }.bind(this))

          //Check if querySnapshot found any matches
          if (this.state.docValid){
            //No duplicates found, we are good to add to the db
            roomRef.add({
              room_name: this.state.value.trim(),
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
              player_names: [],
              player_scores: [],
              winner: false,
              winner_name: ''
            });
            console.log("Sent data to database for new room");

            console.log("Sending url: " + nextUrl);
            history.push(nextUrl); //Move to the upload page for the next steps
          }
          this.setState({docValid: true}); //done with methods, allow data to be valid again
        }.bind(this))
        .catch(function(error){
          console.log("Error getting documents: ", error);
        });
    }
  }



  render() {
    return (
      <form onSubmit={this.handleSubmit}>
      <div className="roomCreation">
        {this.state.alertVisible && (<Alert variant="danger">{this.state.alertText}</Alert>)}
        {!this.state.alertVisible && (<Alert variant="danger" style={{visibility:"hidden"}}>{this.state.alertText}</Alert>)}
        <input className="createInput" required type="text" value={this.state.value} onChange={this.handleChange} placeholder="Room Name" />
        <Button className="createBtn" variant="outline-success" type="submit" >Create Room</Button>{' '}
      </div>
      </form>
    );
  }
}


function App(){
  return(
    <div className="App">
      <header className="App-header">Real-Time Bingo Online</header>
      <NameForm/>
    </div>
  );

}

//original for reference
// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

export default App;
