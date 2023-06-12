const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const dotenv = require('dotenv');

dotenv.config();

// Create a configuration object with API key
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create an instance of the OpenAI API with the configuration object
const openai = new OpenAIApi(configuration);

// Function to generate a response based on chat history
const generateResponse = async (chatHistory) => {
  try {
    // Use the OpenAI API to create a completion based on the chat history
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: chatHistory,
      max_tokens: 300, // This can be changed depending on how long you want the response to be
    });

    // Remove 'Robo: ' from the start of the response, if it exists
    const response = completion.data.choices[0].text.trim().replace(/^Robo:\s*/, '');

    return response;
  } catch (error) {
    // Catch specific errors if possible
    if (error.response && error.response.status) {
      console.log(`Error ${error.response.status}: ${error.response.data.error.message}`);
    } else {
      console.log(`Error: ${error.message}`);
    }
  }
};

// dall-e
const drawGpt = async (text) => {
  try {
    const image = await openai.createImage({
      prompt: text,
      n: 1,
      size: "512x512"
  });
  const imgUrl = image.data.data[0].url;

  return imgUrl;
  } catch (error) {
    // Catch specific errors if possible
    if (error.response && error.response.status) {
      console.log(`Error ${error.response.status}: ${error.response.data.error.message}`);
    } else {
      console.log(`Error: ${error.message}`);
    }
  }
};

// Function to summarize text
const summarizeText = async (maxTokens, text) => {
  try {
    // Use the OpenAI API to create a completion for text summarization
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `Summarize the following text into a few paragraphs at most, and make sure that the summary is actually smaller than the originally provided text:\n\n${text}`,
      max_tokens: maxTokens, // Use the provided maxTokens value
      temperature: 1, // Adjust this value to control the randomness of the output
      top_p: 1 // Adjust this value to control the diversity of the output
      // frequency_penalty: 0.0, // Set the frequency penalty to 0, meaning the model will not consider the frequency of the generated response
      // presence_penalty: 1 // Set the presence penalty to 1, meaning the model will heavily penalize generating a response that has already been generated in the conversation.
    });

    // Extract the summary from the completion response
    const summary = completion.data.choices[0].text.trim();

    return summary;
  } catch (error) {
    // Catch specific errors if possible
    if (error.response && error.response.status) {
      console.log(`Error ${error.response.status}: ${error.response.data.error.message}`);
    } else {
      console.log(`Error: ${error.message}`);
    }
  }
};

// transcribeAudio

async function transcribeOpenAI(audioBuffer) {
  const url = 'https://api.openai.com/v1/audio/transcriptions';
  let language = "";

  const tempdir = os.tmpdir();
  const oggPath = path.join(tempdir, randomUUID() + ".ogg");
  const wavFilename = randomUUID() + ".wav";
  const wavPath = path.join(tempdir, wavFilename);
  fs.writeFileSync(oggPath, audioBuffer);
  try {
    await convertOggToWav(oggPath, wavPath);
  } catch (e) {
    fs.unlinkSync(oggPath);
    return {
      text: "",
      language
    };
  }

  // FormData
  const formData = new FormData();
  formData.append("file", new File([blobFromSync(wavPath)], wavFilename, { type: "audio/wav" }));
  formData.append("model", "whisper-1");

  const headers = new Headers();
  headers.append("Authorization", `Bearer ${process.env.OPENAI_API_KEY}`);

  // Request options
  const options = {
    method: "POST",
    body: formData,
    headers
  };

  let response;
  try {
    response = await fetch(url, options);
  } catch (e) {
    console.error(e);
  } finally {
    fs.unlinkSync(oggPath);
    fs.unlinkSync(wavPath);
  }

  if (!response || response.status != 200) {
    console.error(response);
    return {
      text: "",
      language: language
    };
  }

  const transcription = await response.json();
  return {
    text: transcription.text,
    language
  };
}

async function convertOggToWav(oggPath, wavPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(oggPath)
      .toFormat("wav")
      .outputOptions("-acodec pcm_s16le")
      .output(wavPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}


module.exports = { generateResponse, summarizeText, drawGpt, transcribeOpenAI };
