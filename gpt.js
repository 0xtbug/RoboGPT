const { Configuration, OpenAIApi } = require("openai");
const dotenv = require('dotenv');

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const generateResponse = async (chatHistory) => {
  try {
    const completion = await openai.createCompletion({
      model: "gpt-3.5-turbo",
      prompt: chatHistory,
      max_tokens: 150, // This can be changed depending on how long you want the response to be
    });

    // Remove 'Me: ' from the start of the response
    let response = completion.data.choices[0].text.trim();
    if (response.startsWith('Me:')) {
      response = response.slice(4);
    }

    return response;
  } catch (error) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  }
};

module.exports = { generateResponse };
