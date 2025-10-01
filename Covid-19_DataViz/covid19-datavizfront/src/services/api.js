import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const getData = async () => {
    try {
        const response = await axios.get(`${API_URL}/get_data`);
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
};

export const getDeathByCountry = async (country) => {
    try {
        const response = await axios.get(`${API_URL}/get_death_by_country`, {
            params: { country },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching death data by country:', error);
        throw error;
    }
};

export const getTotalCasesPerCountry = async (country) => {
    try {
        const response = await axios.get(`${API_URL}/get_total_cases_per_country`, {
            params: { country },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching total cases by country:', error);
        throw error;
    }
};

export const getGlobalTotalCases = async () => {
    try {
        const response = await axios.get(`${API_URL}/get_total_cases`);
        return response.data;
    } catch (error) {
        console.error('Error fetching global total cases:', error);
        throw error;
    }
};

export const getGlobalTotalDeaths = async () => {
    try {
        const response = await axios.get(`${API_URL}/get_total_deaths`);
        return response.data;
    } catch (error) {
        console.error('Error fetching global total deaths:', error);
        throw error;
    }
};

export const getTotalDeathsPerCountry = async () => {
    try {
      const response = await axios.get(`${API_URL}/get_total_deaths_per_country`);
      return response.data;
    } catch (error) {
      console.error('Error fetching total deaths per country:', error);
      throw error;
    }
};

export const getTotalRecoveredPerCountry = async (country) => {
    try {
        const response = await axios.get(`${API_URL}/get_total_recovered_per_country`, {
            params: { country },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching total recovered by country:', error);
        throw error;
    }
};

export const getGlobalTotalRecovered = async () => {
    try {
        const response = await axios.get(`${API_URL}/get_total_recovered`);
        return response.data;
    } catch (error) {
        console.error('Error fetching global total recovered:', error);
        throw error;
    }
};


export const get28DayCases = async () => {
    try {
        const response = await axios.get(`${API_URL}/get_28_day_cases`);
        return response.data;
    } catch (error) {
        console.error('Error fetching 28-day cases:', error);
        throw error;
    }
};

export const get28DayCasesPerCountry = async () => {
    try {
        const response = await axios.get(`${API_URL}/get_28_day_cases_per_country`);
        return response.data;
    } catch (error) {
        console.error('Error fetching 28-day cases per country:', error);
        throw error;
    }
};

export const get28DayDeaths = async () => {
    try {
        const response = await axios.get(`${API_URL}/get_28_day_deaths`);
        return response.data;
    } catch (error) {
        console.error('Error fetching 28-day deaths:', error);
        throw error;
    }
};

export const get28DayDeathsPerCountry = async () => {
    try {
        const response = await axios.get(`${API_URL}/get_28_day_deaths_per_country`);
        return response.data;
    } catch (error) {
        console.error('Error fetching 28-day deaths per country:', error);
        throw error;
    }
};

export const getTotalVaccineDoses = async () => {
    try {
        const response = await axios.get(`${API_URL}/get_total_vaccine_doses`);
        return response.data;
    } catch (error) {
        console.error('Error fetching total vaccine doses:', error);
        throw error;
    }
};

export const getTotalVaccineDosesPerCountry = async (country) => {
    try {
        const response = await axios.get(`${API_URL}/get_vaccine_doses_per_country`, {
            params: { country },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching vaccine doses by country:', error);
        throw error;
    }
};

export const get28DayVaccineDoses = async () => {
    try {
        const response = await axios.get(`${API_URL}/get_28_day_vaccine_doses`);
        return response.data;
    } catch (error) {
        console.error('Error fetching 28-day vaccine doses:', error);
        throw error;
    }
};

export const get28DayVaccineDosesPerCountry = async () => {
    try {
        const response = await axios.get(`${API_URL}/get_28_day_vaccine_doses_per_country`);
        return response.data;
    } catch (error) {
        console.error('Error fetching 28-day vaccine doses per country:', error);
        throw error;
    }
};
