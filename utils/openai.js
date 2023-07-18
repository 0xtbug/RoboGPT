const { Configuration, OpenAIApi } = require("openai");
const dotenv = require('dotenv');
const axios = require('axios');

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

const checkApiOpenai = async () => {
  try {
    const response = await axios.get('https://api.openai.com/v1/dashboard/billing/subscription', {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    const data = response.data;
    const message = JSON.stringify(data, null, 2);
    return message;
  } catch (error) {
    handleError(error);
  }
};

const checkBillingDetails = async (responseMessage) => {
  const headers = {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const subscriptionUrl = 'https://api.openai.com/v1/dashboard/billing/subscription';
  const usageUrl = 'https://api.openai.com/v1/dashboard/billing/usage';

  try {
    const subscriptionResponse = await axios.get(subscriptionUrl, { headers });
    const subscriptionData = subscriptionResponse.data;

    const currentDate = new Date();
    const totalAmount = subscriptionData.system_hard_limit_usd;
    const expiryDate = new Date(subscriptionData.access_until * 1000 + 8 * 60 * 60 * 1000);
    const formattedDate = `${expiryDate.getFullYear()}-${(expiryDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${expiryDate.getDate().toString().padStart(2, '0')}`;

    let GPT4CheckResult = '❌';
    let isSubscrible = '🔴';

    const gpt4CheckUrl = 'https://api.openai.com/v1/models';
    const gpt4CheckResponse = await axios.get(gpt4CheckUrl, { headers });
    const gpt4CheckData = gpt4CheckResponse.data;

    if (Array.isArray(gpt4CheckData.data) && gpt4CheckData.data.some((item) => item.id.includes('gpt-4'))) {
      GPT4CheckResult = '✅';
    }

    if (subscriptionData.plan.id.includes('payg')) {
      isSubscrible = '🟢';
    }

    let remaining;
    if (currentDate > expiryDate) {
      remaining = '🔴Exp';
    } else {
      const usageResponse = await axios.get(usageUrl, {
        headers,
        params: {
          start_date: formatDate(new Date(currentDate - 90 * 24 * 60 * 60 * 1000)),
          end_date: formatDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)),
        },
      });

      const usageData = usageResponse.data;
      totalUsage = usageData.total_usage / 100;
      remaining = subscriptionData.system_hard_limit_usd - totalUsage;
    }

    const result = {
      totalAmount,
      totalUsage,
      remaining,
      formattedDate,
      GPT4CheckResult,
      isSubscrible,
    };

    let message = responseMessage || '';
    
    message += `\nTotal saldo: ${result.totalAmount}`;
    message += `\nSaldo telah digunakan: ${result.totalUsage}`;
    message += `\nSaldo tersisa: ${result.remaining}`;
    message += `\nBerlaku sampai: ${result.formattedDate}`;
    message += `\nSupport GPT4: ${result.GPT4CheckResult}`;
    message += `\nStatus Apikey: ${result.isSubscrible}`;
  
    return message;
  } catch (error) {
    console.error('Error:', error);
    return {
      error: 'Error',
      totalAmount: null,
      totalUsage: null,
      remaining: null,
      formattedDate: null,
      GPT4CheckResult: null,
      isSubscrible: null,
    };
  }
};

function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Utility function to handle errors and log them
const handleError = (error) => {
  if (error.response && error.response.status) {
    console.log(`Error ${error.response.status}: ${error.response.data.error.message}`);
  } else {
    console.log(`Error: ${error.message}`);
  }
};

module.exports = {
  generateResponse,
  summarizeText,
  drawGpt,
  introduction,
  checkApiOpenai,
  checkBillingDetails
};
