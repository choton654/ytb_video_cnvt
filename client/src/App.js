import axios from "axios";
import JsFileDownloader from 'js-file-downloader';
import OpenAI from 'openai';
import React, { Component } from "react";
import {
  Button,
  Col,
  Container,
  Form,
  Input,
  Jumbotron,
  Progress,
  Row,
} from "reactstrap";
import openSocket from "socket.io-client";
import "./App.css";

const URL = "/";
const socket = openSocket(URL);

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      urlText: "",
      respData: "",
      percentage: "",
      dataToBeDownloaded: 0,
      dataDownloaded: 0,
      blobData: null,
      videoName: "",
      videoUploader: "",
      videoText: '', loading: false
    };
  }

  handleSubmit = (e) => {
    e.preventDefault();
    this.setState({ ...this.state, loading: true })
    axios
      .post(
        URL,
        { url: this.state.urlText },
        {
          responseType: "blob",
          onDownloadProgress: (progressEvent) => {
            // console.log(progressEvent);
            this.setState({ dataDownloaded: progressEvent.loaded });
          },
        }
      )
      .then((response) => {
        console.log('---data---',response.data);
        const url = window.URL.createObjectURL(new Blob([response.data], { type: "audio/mp3" }));
        this.setState({ blobData: url });
        this.setState({ ...this.state, loading: false })
        // new JsFileDownloader({
        //   url: url, contentType: "audio/mp3", filename: 'audio.mp3'
        // })
        //   .then(async (value) => {
        //     // Called when download ended
        //     console.log('mp3 value', value);
        //     const openai = new OpenAI({
        //       apiKey: process.env.REACT_APP_OPENAI_KEY, dangerouslyAllowBrowser: true
        //     });
        //     const transcription = await openai.audio.transcriptions.create({
        //       model: 'whisper-1',
        //       file: value.downloadedFile,
        //     })

        //     if (transcription.text) {
        //       this.setState({ ...this.state, videoText: transcription.text });

        //     }
        //     this.setState({ ...this.state, loading: false })
        //   })
        //   .catch((error) => {
        //     // Called when an error occurred
        //     console.error(error);
        //     this.setState({ ...this.state, loading: false })
        //   });

      }).catch(e => { this.setState({ ...this.state, loading: false }) });
  };

  handleTextChange = (e) => {
    this.setState({ urlText: e.target.value });
  };

  componentDidMount() {
    socket.on("progressEventSocket", (data) => {
      this.setState({ percentage: data[0] });
    });

    socket.on("downloadCompletedServer", (data) => {
      // console.log(data[0]);
      this.setState({ dataToBeDownloaded: data[0] });
    });

    socket.on("videoDetails", (data) => {
      this.setState({ videoName: data[0] });
      this.setState({ videoUploader: data[1] });
    });
  }

  render() {
    return (
      <Container>
        <Form onSubmit={(e) => this.handleSubmit(e)}>
          <Row>
            <Col>
              <Input
                required
                type="text"
                placeholder="URL"
                value={this.state.urlText}
                onChange={(e) => this.handleTextChange(e)}
              ></Input>
            </Col>
          </Row>
          <Row style={{ textAlign: "center", marginTop: "10px" }}>
            <Col>
              <Button type="submit" color="primary" size="lg" disabled={this.state.loading}>
                Start Process
              </Button>
            </Col>
          </Row>
        </Form>

        <Row>
          <Col>
            {this.state.videoName !== "" ? (
              <Jumbotron style={{ marginTop: "10px" }}>
                <h1>Title:{this.state.videoName}</h1>
                <p>Uploaded By: {this.state.videoUploader}</p>
              </Jumbotron>
            ) : (
              ""
            )}
          </Col>
        </Row>

        <Row className="progressBarRow">
          <Col xs="12">
            <Progress
              animated={this.state.percentage === 100 ? false : true}
              value={this.state.percentage}
            >
              Warming up the router
            </Progress>
          </Col>
        </Row>

        <Row className="progressBarRow">
          <Col xs="12">
            <Progress
              animated={
                (this.state.dataDownloaded * 100) /
                  this.state.dataToBeDownloaded ===
                  100
                  ? false
                  : true
              }
              color="success"
              value={
                this.state.dataToBeDownloaded > 0
                  ? (this.state.dataDownloaded * 100) /
                  this.state.dataToBeDownloaded
                  : 0
              }
            >
              You're Hacking Now. Be Patient :)
            </Progress>
          </Col>
        </Row>

        <Row className="downloadButton">
          <Col>
            {this.state.blobData !== null ? (
              <div>
                <p>Congratulations! You've hacked into the Pentagon</p>
                <a
                  href={this.state.blobData}
                  download={this.state.videoName + ".mp3"}
                >
                  <Button color="danger" size="lg" disabled={this.state.loading}>
                    Download
                  </Button>
                </a>
              </div>
            ) : (
              ""
            )}
          </Col>
        </Row>
        {this.state.videoText && (
          <Row>
            <p>{this.state.videoText}</p>
          </Row>
        )}
      </Container>
    );
  }
}
