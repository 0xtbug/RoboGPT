const { Configuration, OpenAIApi } = require("openai");
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

const drawGpt = async (text) => {
  try {
    const completion = await openai.createImage({
      prompt: text,
      n: 1,
      size: "512x512",
  });
  const drawing = completion.data.data[0].url;
  return drawing;
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

module.exports = { generateResponse, summarizeText, drawGpt };
