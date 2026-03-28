const axios = require('axios');
axios.post('http://localhost:3001/analyze', { text: 'https://www.bbc.com/news/world-us-canada-latest' })
  .then(res => console.log('SUCCESS:', res.data))
  .catch(err => console.error('ERROR:', err.response ? err.response.data : err.message));
