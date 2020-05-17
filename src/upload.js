import React from 'react';
import logo from './logo.svg';
import './App.css';
import {Button, Alert, Table} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import {db} from './index';
import firebase from './index'
import CSVReader from 'react-csv-reader'
import './upload.css'
import { Link} from 'react-router-dom';


const papaparseOptions = {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  transformHeader: header =>
    header
      .toLowerCase()
      .replace(/\W/g, '_')
}

class BoardEntry {
  //This class contains the metadata to receive/send the information about bingo squares to firebase
  constructor (name, description, rarity){
    this.name = name;
    this.description = description;
    this.rarity = rarity;
  }
  toString(){
    return this.name + ', ' + this.description + ', ' + this.rarity;
  }

}

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
      return new BoardEntry(data.name, data.description, data.rarity)
  }
}

class Upload extends React.Component {
  //Props extracts info from the url
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      room_name: decodeURIComponent(props.match.params.room_name),
      roomId: ''
    };
    console.log("Room name received: " + this.state.room_name);

    this.handleFileLoad = this.handleFileLoad.bind(this);
    this.handleFileError = this.handleFileError.bind(this);
  }

  handleFileLoad(data, fileInfo){
    // console.log(data,fileInfo); //Debug with entire csv file information
    if (!fileInfo.name.endsWith('.csv')){
      //User put in the wrong kind of file

      //TODO display an error or alert or something
    }
    else{
      //valid file type, now check the contents
      data.forEach(function(item, index){
        if (typeof item.rarity != 'number' ||
          (typeof item.rarity == 'number' && (item.rarity < 0 || item.rarity > 5))){
            //The rarity should be a number showing how rare it is.
            //Hitting here means there is at least one row in the csv that has a bad value for rarity

            //TODO add error or alert
        }

      });
        //data is valid, since all the other fields are stings and should be fine
        //Now save the data to firebase for use later
        const roomRef = db.collection('rooms');
        //First get the ID of the storage for this room
        roomRef.where("room_name", "==", this.state.room_name)
          .get()
          .then(function(querySnapshot){
            console.log("Doc ID query returned");
            querySnapshot.forEach(function(doc) {
              // doc.data() is never undefined for query doc snapshots
              if (doc.id != '' && doc.id != null && this.state.roomId === ''){
                //Only take the first doc ID that has content since we blocked duplicates in App.js
                this.state.roomId = doc.id;
              }
              console.log("DocID found " + doc.id);
            }.bind(this));

            //Error check if we got a document
            if (this.state.roomId !== ''){
              var documentList = [];
              //Get the ID of any old information that we need to remove
              roomRef.doc(this.state.roomId).collection("board_entries").get().then(function(querySnapshot) {
                  querySnapshot.forEach(function(doc) {
                      // doc.data() is never undefined for query doc snapshots
                      documentList.push(doc.id); //Store all the documents that are old
                    }.bind(this));

                      //Remove old info from the database
                      documentList.forEach(function(docID){
                        roomRef.doc(this.state.roomId).collection("board_entries").doc(docID).delete().then(function() {
                            console.log("Document successfully deleted!");
                        }).catch(function(error) {
                            console.error("Error removing document: ", error);
                        });
                      }.bind(this));


                      //Add the uploaded CSV to the database
                      data.forEach(function(item, index){
                        console.log(item);
                        roomRef.doc(this.state.roomId).collection("board_entries")
                          .withConverter(entryConverter)
                          .add(new BoardEntry(item.name, item.description, item.rarity))
                          .then(function(){
                            console.log("Entry written to firebase");
                          }.bind(this));
                      }.bind(this));


              }.bind(this));
            }
            else{
              console.log("Couldn't find a document with this room name");
            }
          }.bind(this))
          .catch(function(error){
            console.log("Error getting documents: ", error);
          }.bind(this));
    }
  }

  handleFileError(error){
    console.log("Error reading your file: Message: " + error.message);
  }

  render() {
    return(
      <div className="App">
        <header className="App-header">Real-Time Bingo Online</header>
        <CSVReader
           cssClass="csv-reader-input"
           label="Select CSV with the correct formatting:"
           onFileLoaded={this.handleFileLoad}
           onError={this.handleFileError}
           parserOptions={papaparseOptions}
           inputId="csv-reader"
           inputStyle={{color: 'red'}}
         />
         <div className="formatContainer">
           <Alert variant="primary">The following table displays how to format your data. Save files in comma separated values (CSV) format.</Alert>
           <Table striped bordered hover variant="dark" className="formatTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Rarity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Grand Slam</td>
                <td>A batter hits a homerun with the bases loaded.</td>
                <td>5</td>
              </tr>
              <tr>
                <td>Strikeout</td>
                <td>A batter accumulates 3 strikes while batting.</td>
                <td>2</td>
              </tr>
              <tr>
                <td>Sunflower Seeds</td>
                <td>A person is spotted spitting sunflower seeds in the dugout.</td>
                <td>3</td>
              </tr>
            </tbody>
          </Table>
          <Alert variant="info"><Alert.Heading>Name</Alert.Heading><p>Main text displayed on each bingo square.</p>
            <hr />
            <Alert.Heading>Description</Alert.Heading>
            <p>OPTIONAL: Describes what needs to happen to check this event off on a bingo board.</p>
            <hr />
            <Alert.Heading>Rarity</Alert.Heading>
            <p>How often does this normally occur? 0 = very commonly, 5 = Extremely rare. Bingo boards are generated so that fewer rare events are displayed on each board.</p></Alert>
          <Alert variant="warning"> You can download the template below for a quick start and it should open in most spreadsheet editors</Alert>
          <Link to="/Real-Time Bingo Data Template.csv" target="_blank" download>Download Template</Link>
        </div>



      </div>
    );
  }
}


export default Upload;
