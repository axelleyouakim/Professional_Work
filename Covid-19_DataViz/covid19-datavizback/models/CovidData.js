import mongoose from 'mongoose';

const covidDataSchema = new mongoose.Schema({
  Country_Region: { type: String, required: true },
  Confirmed: { type: Number, default: 0 },
  Deaths: { type: Number, default: 0 },
  Recovered: { type: Number, default: 0 },
  Doses_admin: { type: Number, default: 0 },
  Date: { type: Date, required: true }
});

const CovidData = mongoose.model('CovidData', covidDataSchema);

export default CovidData;


// import mongoose from 'mongoose';

// const confirmedSchema = new mongoose.Schema({
//   Province_State: { type: String, default: null },
//   Country_Region: { type: String, required: true },
//   Lat: { type: Number, required: true },
//   Long: { type: Number, required: true },
//   Cases: { type: Map, of: Number }
// });

// const deathsSchema = new mongoose.Schema({
//   Province_State: { type: String, default: null },
//   Country_Region: { type: String, required: true },
//   Lat: { type: Number, required: true },
//   Long: { type: Number, required: true },
//   Deaths: { type: Map, of: Number }
// });

// const recoveredSchema = new mongoose.Schema({
//   Province_State: { type: String, default: null },
//   Country_Region: { type: String, required: true },
//   Lat: { type: Number, required: true },
//   Long: { type: Number, required: true },
//   Recoveries: { type: Map, of: Number }
// });

// const vaccineSchema = new mongoose.Schema({
//   Date: { type: Date, required: true },
//   UID: { type: Number, required: true },
//   Province_State: { type: String, default: null },
//   Country_Region: { type: String, required: true },
//   Doses_admin: { type: Number, required: true },
//   People_at_least_one_dose: { type: Number, required: true },
// });

// const Confirmed = mongoose.model('Confirmed', confirmedSchema);
// const Deaths = mongoose.model('Deaths', deathsSchema);
// const Recovered = mongoose.model('Recovered', recoveredSchema);
// const Vaccine = mongoose.model('Vaccine', vaccineSchema);

// // export { Confirmed, Deaths, Recovered, Vaccine };
// // export { CovidData };
// export const CovidData = { Confirmed, Deaths, Recovered, Vaccine };
