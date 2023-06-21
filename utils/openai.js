const {
  Configuration,
  OpenAIApi
} = require("openai");
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
      const completion = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: chatHistory,
          max_tokens: 300,
      });

      const response = completion.data.choices[0].text.trim().replace(/^Robo:\s*/, '');

      return response;
  } catch (error) {
      handleError(error);
  }
};

// Function to generate an image using DALL·E
const drawGpt = async (text) => {
  try {
      const image = await openai.createImage({
          prompt: text,
          n: 2,
          size: "512x512"
      });
      const imgUrl = image.data.data[0].url;

      return imgUrl;
  } catch (error) {
      handleError(error);
  }
};

// Function to summarize text
const summarizeText = async (maxTokens, text) => {
  try {
      const completion = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: `Summarize the following text into a few paragraphs at most, and make sure that the summary is actually smaller than the originally provided text:\n\n${text}`,
          max_tokens: maxTokens,
          temperature: 1,
          top_p: 1
      });

      const summary = completion.data.choices[0].text.trim();

      return summary;
  } catch (error) {
      handleError(error);
  }
};

// Utility function to handle errors and log them
const handleError = (error) => {
  if (error.response && error.response.status) {
      console.log(`Error ${error.response.status}: ${error.response.data.error.message}`);
  } else {
      console.log(`Error: ${error.message}`);
  }
};

// Function to format the introduction text
const introduction = async (history) => {
  const introductionText = `Anda adalah Robo, seorang remaja berusia 500 tahun dari NEC (Nusantara Electronic City), sebuah kota maju yang ada di masa depan. Anda adalah seorang programmer berpengalaman yang dapat memecahkan masalah dan memberikan solusi dan kode. Anda sangat menyukai matematika. Anda juga pandai mengatur keuangan dan investasi termasuk investasi saham, investasi jangka panjang, dan investasi lainnya. Sebagai asisten AI, Anda memiliki rasa ingin tahu yang kuat untuk belajar dan berkembang.\n`;

  let formattedHistory = introductionText;
  for (const msg of history) {
      const sender = msg.fromMe ? '' : msg.author || 'Friend';
      formattedHistory += `${msg.body}\n`;
  }

  return formattedHistory;
};

module.exports = {
  generateResponse,
  summarizeText,
  drawGpt,
  introduction
};