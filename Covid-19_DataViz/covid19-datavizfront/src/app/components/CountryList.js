'use client';

import React, { useMemo } from 'react';
import './Dashboard.css';

import { getFlagUrl } from '../utils/countryFlags';

// ─── Mapping nom propre → ISO2 pour flagcdn.com ───────────────────────────────
// Clés = noms APRÈS nettoyage par usePreCalculatedData (cleanName)
// const COUNTRY_TO_ISO2 = {
//   'Afghanistan':'af','Albania':'al','Algeria':'dz','Andorra':'ad','Angola':'ao',
//   'Antigua and Barbuda':'ag','Argentina':'ar','Armenia':'am','Australia':'au','Austria':'at',
//   'Azerbaijan':'az','Bahamas':'bs','Bahrain':'bh','Bangladesh':'bd','Barbados':'bb',
//   'Belarus':'by','Belgium':'be','Belize':'bz','Benin':'bj','Bhutan':'bt',
//   'Bolivia':'bo','Bosnia and Herzegovina':'ba','Botswana':'bw','Brazil':'br','Brunei':'bn',
//   'Bulgaria':'bg','Burkina Faso':'bf','Myanmar':'mm','Burundi':'bi','Cape Verde':'cv',
//   'Cambodia':'kh','Cameroon':'cm','Canada':'ca','Central African Republic':'cf','Chad':'td',
//   'Chile':'cl','China':'cn','Colombia':'co','Comoros':'km','Congo (Brazzaville)':'cg',
//   'Congo (Kinshasa)':'cd','Costa Rica':'cr',"Côte d'Ivoire":'ci','Croatia':'hr','Cuba':'cu',
//   'Cyprus':'cy','Czechia':'cz','Denmark':'dk','Djibouti':'dj','Dominica':'dm',
//   'Dominican Republic':'do','Ecuador':'ec','Egypt':'eg','El Salvador':'sv',
//   'Equatorial Guinea':'gq','Eritrea':'er','Estonia':'ee','Eswatini':'sz','Ethiopia':'et',
//   'Fiji':'fj','Finland':'fi','France':'fr','Gabon':'ga','Gambia':'gm','Georgia':'ge',
//   'Germany':'de','Ghana':'gh','Greece':'gr','Grenada':'gd','Guatemala':'gt','Guinea':'gn',
//   'Guinea-Bissau':'gw','Guyana':'gy','Haiti':'ht','Vatican City':'va','Honduras':'hn',
//   'Hungary':'hu','Iceland':'is','India':'in','Indonesia':'id','Iran':'ir','Iraq':'iq',
//   'Ireland':'ie','Israel':'il','Italy':'it','Jamaica':'jm','Japan':'jp','Jordan':'jo',
//   'Kazakhstan':'kz','Kenya':'ke','Kiribati':'ki','Korea, North': 'kp','Korea, South': 'kr',
//   'Kosovo':'xk','Kuwait':'kw','Kyrgyzstan':'kg','Laos':'la','Latvia':'lv','Lebanon':'lb',
//   'Lesotho':'ls','Liberia':'lr','Libya':'ly','Liechtenstein':'li','Lithuania':'lt',
//   'Luxembourg':'lu','Madagascar':'mg','Malawi':'mw','Malaysia':'my','Maldives':'mv',
//   'Mali':'ml','Malta':'mt','Marshall Islands':'mh','Mauritania':'mr','Mauritius':'mu',
//   'Mexico':'mx','Micronesia':'fm','Moldova':'md','Monaco':'mc','Mongolia':'mn',
//   'Montenegro':'me','Morocco':'ma','Mozambique':'mz','Namibia':'na','Nauru':'nr',
//   'Nepal':'np','Netherlands':'nl','New Zealand':'nz','Nicaragua':'ni','Niger':'ne',
//   'Nigeria':'ng','North Macedonia':'mk','Norway':'no','Oman':'om','Pakistan':'pk',
//   'Palau':'pw','Panama':'pa','Papua New Guinea':'pg','Paraguay':'py','Peru':'pe',
//   'Philippines':'ph','Poland':'pl','Portugal':'pt','Qatar':'qa','Romania':'ro',
//   'Russia':'ru','Rwanda':'rw','Saint Kitts and Nevis':'kn','Saint Lucia':'lc',
//   'Saint Vincent and the Grenadines':'vc','Samoa':'ws','San Marino':'sm',
//   'São Tomé and Príncipe':'st','Saudi Arabia':'sa','Senegal':'sn','Serbia':'rs',
//   'Seychelles':'sc','Sierra Leone':'sl','Singapore':'sg','Slovakia':'sk','Slovenia':'si',
//   'Solomon Islands':'sb','Somalia':'so','South Africa':'za','South Sudan':'ss',
//   'Spain':'es','Sri Lanka':'lk','Sudan':'sd','Suriname':'sr','Sweden':'se',
//   'Switzerland':'ch','Syria':'sy','Taiwan':'tw','Tajikistan':'tj','Tanzania':'tz',
//   'Thailand':'th','East Timor':'tl','Togo':'tg','Tonga':'to',
//   'Trinidad and Tobago':'tt','Tunisia':'tn','Turkey':'tr','Turkmenistan':'tm',
//   'Tuvalu':'tv','Uganda':'ug','Ukraine':'ua','UAE':'ae',
//   'United Kingdom':'gb','Uruguay':'uy','US':'us','Uzbekistan':'uz','Vanuatu':'vu',
//   'Venezuela':'ve','Vietnam':'vn','Palestine':'ps','West Bank and Gaza':'ps','Western Sahara':'eh',
//   'Yemen':'ye','Zambia':'zm','Zimbabwe':'zw',
// };

// const getFlagUrl = (country) => {
//   const iso2 = COUNTRY_TO_ISO2[country];
//   return iso2 ? `https://flagcdn.com/16x12/${iso2}.png` : null;
// };

const CountryList = ({
  title,
  type = 'cases',
  countriesData = [],
  searchTerm = '',
  selectedCountry,
  onCountryClick,
  labelSuffix = '',
  colorClass = 'red-text',
  isLoading = false,
  error = null,
}) => {
  const dataKey = type === 'deaths' ? 'total_deaths' : type === 'recovered' ? 'total_recovered' : 'total_cases';

  const filteredCountries = useMemo(() => {
    if (!countriesData || countriesData.length === 0) return [];
    if (!searchTerm) return countriesData;
    const q = searchTerm.toLowerCase().trim();
    return countriesData.filter((c) => c.country.toLowerCase().includes(q));
  }, [countriesData, searchTerm]);

  if (isLoading) return (
    <div className="country-list-container">
      {title && <h4 className="country-list-title">{title}</h4>}
      <div className="country-list">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', gap: '10px' }}>
          <div className="spinner" style={{ width: '30px', height: '30px' }} />
          <p style={{ color: '#999', fontSize: '12px' }}>Loading countries...</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="country-list-container">
      {title && <h4 className="country-list-title">{title}</h4>}
      <div className="country-list">
        <p style={{ color: '#ff4444', padding: '10px', fontSize: '12px' }}>⚠️ Failed to load countries</p>
      </div>
    </div>
  );

  if (filteredCountries.length === 0) return (
    <div className="country-list-container">
      {title && <h4 className="country-list-title">{title}</h4>}
      <div className="country-list">
        <p style={{ color: '#999', padding: '10px', fontSize: '12px' }}>
          {searchTerm ? 'No countries match your search' : 'No countries found'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="country-list-container">
      {title && <h4 className="country-list-title">{title}</h4>}
      <div className="country-list">
        {filteredCountries.map((countryData) => {
          const flagUrl = getFlagUrl(countryData.country);
          return (
            <div
              key={countryData.country}
              className={`country-item ${selectedCountry === countryData.country ? 'selected' : ''}`}
              onClick={() => onCountryClick?.(countryData.country)}
            >
              <span className={`country-cases ${colorClass}`}>
                {countryData[dataKey]?.toLocaleString() || '0'}
              </span>
              {labelSuffix ? (
                <><span> </span><span className="country-name-small">{labelSuffix}</span><br /></>
              ) : (
                <span> </span>
              )}
              {flagUrl && (
                <img
                  src={flagUrl}
                  alt=""
                  width={16}
                  height={12}
                  loading="lazy"
                  style={{ verticalAlign: 'middle', marginRight: '4px', flexShrink: 0 }}
                  onError={e => e.target.style.display = 'none'}
                />
              )}
              <span className="country-name">{countryData.country}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(CountryList, (prev, next) => {
  return (
    prev.countriesData === next.countriesData &&
    prev.selectedCountry === next.selectedCountry &&
    prev.searchTerm === next.searchTerm &&
    prev.isLoading === next.isLoading &&
    prev.error === next.error
  );
});