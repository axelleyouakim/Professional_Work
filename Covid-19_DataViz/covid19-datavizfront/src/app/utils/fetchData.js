// a supprimer
import axios from 'axios';
import Papa from 'papaparse';

const fetchCovidData = async (url) => {
  // const response = await axios.get(url);
  // const csvData = response.data;

  // return new Promise((resolve, reject) => {
  //   Papa.parse(csvData, {
  //     header: true,
  //     dynamicTyping: true,
  //     complete: (results) => {
  //       resolve(results.data);
  //     },
  //     error: (error) => {
  //       reject(error);
  //     },
  //   });
  // });
};

export default fetchCovidData;