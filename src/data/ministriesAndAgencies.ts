export type MinistryData = {
  id: string;
  ministry: string;
  agencies: string[];
};

export const FEDERAL_MINISTRIES_AND_AGENCIES: MinistryData[] = [
  {
    id: 'min-01',
    ministry: 'Federal Ministry of Agriculture and Food Security',
    agencies: [
      'Agricultural Research Council of Nigeria (ARCN)',
      'National Agricultural Seeds Council (NASC)',
      'National Agricultural Development Fund (NADF)',
      'Nigerian Agricultural Insurance Corporation (NAIC)',
      'Nigerian Agricultural Quarantine Service (NAQS)',
      'National Root Crops Research Institute (NRCRI)',
      'National Cereals Research Institute (NCRI)',
      'Institute for Agricultural Research (IAR)',
      'Institute of Agricultural Research and Training (IAR&T)',
      'National Horticultural Research Institute (NIHORT)',
      'National Institute for Oil Palm Research (NIFOR)',
      'National Institute for Trypanosomiasis Research (NITR)',
      'Cocoa Research Institute of Nigeria (CRIN)',
      'Lake Chad Research Institute (LCRI)',
      'Federal College of Agriculture, Akure',
      'Federal College of Agriculture, Ibadan',
      'Federal College of Agriculture, Ishiagu',
      'Federal College of Agriculture, Kano',
      'Federal College of Agriculture, Moor Plantation',
      'Federal College of Agriculture, Ogoja',
      'Federal College of Animal Health and Production Technology',
      'Federal College of Fisheries and Marine Technology'
    ]
  },
  {
    id: 'min-02',
    ministry: 'Federal Ministry of Art, Culture, Tourism and the Creative Economy',
    agencies: [
      'National Commission for Museums and Monuments (NCMM)',
      'National Council for Arts and Culture (NCAC)',
      'National Gallery of Art (NGA)',
      'National Institute for Cultural Orientation (NICO)',
      'National Troupe of Nigeria',
      'National Theatre',
      'Nigerian Institute for Hospitality and Tourism (NIHOTOUR)',
      'National Film and Video Censors Board (NFVCB)',
      'Copyright Commission',
      'Centre for Black African Arts and Civilization (CBAAC)',
      'National Tourism Development Corporation (NTDC)'
    ]
  },
  {
    id: 'min-03',
    ministry: 'Federal Ministry of Aviation and Aerospace Development',
    agencies: [
      'Federal Airports Authority of Nigeria (FAAN)',
      'Nigerian Civil Aviation Authority (NCAA)',
      'Nigerian Airspace Management Agency (NAMA)',
      'Accident Investigation Bureau Nigeria (AIB-N)',
      'Nigerian College of Aviation Technology (NCAT)',
      'Nigerian Meteorological Agency (NiMet)',
      'National Space Research and Development Agency (NASRDA)',
      'Aviation Safety Investigation Bureau'
    ]
  },
  {
    id: 'min-04',
    ministry: 'Federal Ministry of Budget and Economic Planning',
    agencies: [
      'National Bureau of Statistics (NBS)',
      'Budget Office of the Federation',
      'National Economic Council Secretariat',
      'National Council on Development Planning',
      'National Population Commission (NPC)',
      'National Economic Management Team'
    ]
  },
  {
    id: 'min-05',
    ministry: 'Federal Ministry of Communications, Innovation and Digital Economy',
    agencies: [
      'Nigerian Communications Commission (NCC)',
      'Galaxy Backbone Limited',
      'National Information Technology Development Agency (NITDA)',
      'Nigerian Postal Service (NIPOST)',
      'Nigerian Communications Satellite Limited (NIGCOMSAT)',
      'National Identity Management Commission (NIMC)',
      'Universal Service Provision Fund (USPF)',
      'Nigeria Digital Innovation',
      'National Centre for Artificial Intelligence and Robotics',
      'Nigerian Computer Emergency Response Team (ngCERT)'
    ]
  },
  {
    id: 'min-06',
    ministry: 'Federal Ministry of Defence',
    agencies: [
      'Defence Headquarters',
      'Nigerian Army',
      'Nigerian Navy',
      'Nigerian Air Force',
      'Nigerian Defence Academy (NDA)',
      'National Defence College',
      'Armed Forces Command and Staff College',
      'Defence Industries Corporation of Nigeria (DICON)',
      'Defence Intelligence Agency (DIA)',
      'Defence Space Administration',
      'Military Pensions Board',
      'Nigerian Armed Forces Resettlement Centre',
      'Defence Intelligence School'
    ]
  },
  {
    id: 'min-07',
    ministry: 'Federal Ministry of Education',
    agencies: [
      'National Universities Commission (NUC)',
      'National Board for Technical Education (NBTE)',
      'National Commission for Colleges of Education (NCCE)',
      'Universal Basic Education Commission (UBEC)',
      'Tertiary Education Trust Fund (TETFund)',
      'Joint Admissions and Matriculation Board (JAMB)',
      'West African Examinations Council (WAEC)',
      'National Examinations Council (NECO)',
      'National Business and Technical Examinations Board (NABTEB)',
      'Teachers Registration Council of Nigeria (TRCN)',
      'National Library of Nigeria',
      'Nigerian Educational Research and Development Council (NERDC)',
      'National Commission for Nomadic Education',
      'National Commission for Mass Literacy, Adult and Non-Formal Education',
      'National Teachers Institute (NTI)',
      'National Mathematical Centre (NMC)',
      'National Open University of Nigeria (NOUN)'
    ]
  },
  {
    id: 'min-08',
    ministry: 'Federal Ministry of Environment',
    agencies: [
      'National Environmental Standards and Regulations Enforcement Agency (NESREA)',
      'National Oil Spill Detection and Response Agency (NOSDRA)',
      'National Agency for the Great Green Wall (NAGGW)',
      'National Park Service',
      'National Council on Climate Change',
      'Environmental Impact Assessment Department',
      'Federal Department of Forestry',
      'National Environmental Restoration Fund'
    ]
  },
  {
    id: 'min-09',
    ministry: 'Federal Ministry of Finance',
    agencies: [
      'Federal Inland Revenue Service (FIRS)',
      'Nigeria Customs Service (NCS)',
      'Debt Management Office (DMO)',
      'Office of the Accountant-General of the Federation',
      'Budget Office of the Federation',
      'Securities and Exchange Commission (SEC)',
      'Nigeria Deposit Insurance Corporation (NDIC)',
      'Central Bank of Nigeria (CBN)',
      'Bureau of Public Enterprises (BPE)',
      'National Insurance Commission (NAICOM)',
      'Financial Reporting Council of Nigeria (FRCN)',
      'Nigerian Export-Import Bank (NEXIM Bank)',
      'Bank of Industry (BOI)',
      'Bank of Agriculture (BOA)',
      'Federal Mortgage Bank of Nigeria (FMBN)',
      'Development Bank of Nigeria (DBN)'
    ]
  },
  {
    id: 'min-10',
    ministry: 'Federal Ministry of Foreign Affairs',
    agencies: [
      'Nigerian Institute of International Affairs (NIIA)',
      'Foreign Service Academy',
      'Institute for Peace and Conflict Resolution (IPCR)',
      'Technical Aid Corps (TAC)',
      'Directorate of Technical Cooperation in Africa (DTCA)',
      "Nigeria's Diplomatic Missions"
    ]
  },
  {
    id: 'min-11',
    ministry: 'Federal Ministry of Health and Social Welfare',
    agencies: [
      'National Primary Health Care Development Agency (NPHCDA)',
      'National Agency for Food and Drug Administration and Control (NAFDAC)',
      'National Health Insurance Authority (NHIA)',
      'Nigeria Centre for Disease Control and Prevention (NCDC)',
      'Medical and Dental Council of Nigeria (MDCN)',
      'Nursing and Midwifery Council of Nigeria (NMCN)',
      'Pharmacy Council of Nigeria (PCN)',
      'Medical Laboratory Science Council of Nigeria (MLSCN)',
      'National Institute for Pharmaceutical Research and Development (NIPRD)',
      'National Institute for Medical Research (NIMR)',
      'National Hospital, Abuja',
      'National Agency for the Control of AIDS (NACA)',
      'National Blood Service Commission'
    ]
  },
  {
    id: 'min-12',
    ministry: 'Federal Ministry of Humanitarian Affairs and Poverty Reduction',
    agencies: [
      'National Emergency Management Agency (NEMA)',
      'National Commission for Refugees, Migrants and Internally Displaced Persons (NCFRMI)',
      'National Social Investment Programme Agency (NSIPA)',
      'National Cash Transfer Office',
      'National Home-Grown School Feeding Programme',
      'National Social Safety Nets Coordinating Office'
    ]
  },
  {
    id: 'min-13',
    ministry: 'Federal Ministry of Housing and Urban Development',
    agencies: [
      'Federal Housing Authority (FHA)',
      'Federal Mortgage Bank of Nigeria (FMBN)',
      'Federal Housing Council',
      'Urban Development Board'
    ]
  },
  {
    id: 'min-14',
    ministry: 'Federal Ministry of Information and National Orientation',
    agencies: [
      'Federal Radio Corporation of Nigeria (FRCN)',
      'Nigerian Television Authority (NTA)',
      'News Agency of Nigeria (NAN)',
      'Voice of Nigeria (VON)',
      'National Broadcasting Commission (NBC)',
      'Advertising Regulatory Council of Nigeria (ARCON)',
      'Nigerian Press Council',
      'National Orientation Agency (NOA)',
      'National Archives of Nigeria',
      'Federal Government Press'
    ]
  },
  {
    id: 'min-15',
    ministry: 'Federal Ministry of Industry, Trade and Investment',
    agencies: [
      'Corporate Affairs Commission (CAC)',
      'Nigerian Investment Promotion Commission (NIPC)',
      'Standards Organisation of Nigeria (SON)',
      'Industrial Training Fund (ITF)',
      'Bank of Industry (BOI)',
      'Nigeria Export Promotion Council (NEPC)',
      'Nigeria Export Processing Zones Authority (NEPZA)',
      'Oil and Gas Free Zones Authority (OGFZA)',
      'Small and Medium Enterprises Development Agency of Nigeria (SMEDAN)',
      'National Automotive Design and Development Council (NADDC)',
      'Nigerian Office for Technology Acquisition and Promotion (NOTAP)'
    ]
  },
  {
    id: 'min-16',
    ministry: 'Federal Ministry of Innovation, Science and Technology',
    agencies: [
      'National Centre for Technology Management (NACETEM)',
      'National Agency for Science and Engineering Infrastructure (NASENI)',
      'National Research and Innovation Council',
      'National Research Institute for Chemical Technology (NARICT)',
      'National Institute for Trypanosomiasis Research',
      'Nigerian Institute of Science and Technology',
      'Nigerian Building and Road Research Institute (NBRRI)',
      'Sheda Science and Technology Complex (SHESTCO)',
      'National Space Research and Development Agency (NASRDA)',
      'Energy Commission of Nigeria (ECN)',
      'National Biotechnology Development Agency (NABDA)',
      'National Institute for Pharmaceutical Research and Development (NIPRD)',
      'National Board for Technology Incubation (NBTI)',
      'National Office for Technology Acquisition and Promotion (NOTAP)',
      'Nigerian Institute of Leather and Science Technology (NILEST)',
      'National Institute for Oceanography and Marine Research',
      'Federal Institute of Industrial Research, Oshodi (FIIRO)',
      'Nigerian Natural Medicine Development Agency (NNMDA)'
    ]
  },
  {
    id: 'min-17',
    ministry: 'Federal Ministry of Interior',
    agencies: [
      'Nigeria Immigration Service (NIS)',
      'Nigeria Security and Civil Defence Corps (NSCDC)',
      'Federal Fire Service (FFS)',
      'Nigerian Correctional Service (NCoS)',
      'Civil Defence, Correctional, Fire and Immigration Services Board (CDCFIB)',
      'Citizenship and Business Migration Department'
    ]
  },
  {
    id: 'min-18',
    ministry: 'Federal Ministry of Justice',
    agencies: [
      'Office of the Attorney-General of the Federation',
      'Law Reform Commission',
      'Legal Aid Council of Nigeria',
      'National Human Rights Commission',
      'Council of Legal Education',
      'Nigerian Institute of Advanced Legal Studies (NIALS)',
      'Federal Judicial Service Commission',
      'Nigerian Law School'
    ]
  },
  {
    id: 'min-19',
    ministry: 'Federal Ministry of Labour and Employment',
    agencies: [
      'Industrial Training Fund (ITF)',
      'National Directorate of Employment (NDE)',
      'National Productivity Centre (NPC)',
      'Nigeria Social Insurance Trust Fund (NSITF)',
      'National Pension Commission (PenCom)',
      'Pension Transitional Arrangement Directorate (PTAD)',
      'National Industrial Court of Nigeria'
    ]
  },
  {
    id: 'min-20',
    ministry: 'Federal Ministry of Livestock Development',
    agencies: [
      'National Veterinary Research Institute (NVRI)',
      'National Animal Production Research Institute (NAPRI)',
      'National Institute for Trypanosomiasis Research',
      'National Veterinary Council'
    ]
  },
  {
    id: 'min-21',
    ministry: 'Federal Ministry of Marine and Blue Economy',
    agencies: [
      'Nigerian Maritime Administration and Safety Agency (NIMASA)',
      'Nigerian Ports Authority (NPA)',
      'Nigerian Shippers\' Council (NSC)',
      'National Inland Waterways Authority (NIWA)'
    ]
  },
  {
    id: 'min-22',
    ministry: 'Federal Ministry of Petroleum Resources',
    agencies: [
      'Nigerian National Petroleum Company Limited (NNPC Ltd.)',
      'Nigerian Upstream Petroleum Regulatory Commission (NUPRC)',
      'Nigerian Midstream and Downstream Petroleum Regulatory Authority (NMDPRA)',
      'Nigerian Content Development and Monitoring Board (NCDMB)',
      'Petroleum Technology Development Fund (PTDF)',
      'Nigerian Liquefied Natural Gas Limited (NLNG)'
    ]
  },
  {
    id: 'min-23',
    ministry: 'Federal Ministry of Power',
    agencies: [
      'Transmission Company of Nigeria (TCN)',
      'Nigerian Bulk Electricity Trading Plc (NBET)',
      'Nigerian Electricity Regulatory Commission (NERC)',
      'Rural Electrification Agency (REA)',
      'National Power Training Institute of Nigeria (NAPTIN)',
      'Nigerian Electricity Management Services Agency (NEMSA)'
    ]
  },
  {
    id: 'min-24',
    ministry: 'Federal Ministry of Regional Development',
    agencies: [
      'Niger Delta Development Commission (NDDC)',
      'North East Development Commission (NEDC)',
      'North West Development Commission',
      'South East Development Commission',
      'South West Development Commission'
    ]
  },
  {
    id: 'min-25',
    ministry: 'Federal Ministry of Solid Minerals Development',
    agencies: [
      'Mining Cadastre Office',
      'Nigerian Geological Survey Agency (NGSA)',
      'Mining Inspectorate Department',
      'National Steel Raw Materials Exploration Agency'
    ]
  },
  {
    id: 'min-26',
    ministry: 'Ministry of Special Duties and Inter-Governmental Affairs',
    agencies: [
      'National Boundary Commission',
      'National Hajj Commission of Nigeria',
      'National Christian Pilgrim Commission',
      'National Lottery Trust Fund',
      'National Lottery Regulatory Commission',
      'National Orientation Agency'
    ]
  },
  {
    id: 'min-27',
    ministry: 'Ministry of Steel Development',
    agencies: [
      'Ajaokuta Steel Company Limited',
      'Delta Steel Company',
      'National Steel Raw Materials Exploration Agency'
    ]
  },
  {
    id: 'min-28',
    ministry: 'Federal Ministry of Transportation',
    agencies: [
      'Nigerian Railway Corporation (NRC)',
      'Federal Road Safety Corps (FRSC)'
    ]
  },
  {
    id: 'min-29',
    ministry: 'Federal Ministry of Water Resources and Sanitation',
    agencies: [
      'Nigeria Hydrological Services Agency (NIHSA)',
      'Nigeria Integrated Water Resources Management Commission (NIWRMC)',
      'River Basin Development Authorities',
      'National Water Resources Institute'
    ]
  },
  {
    id: 'min-30',
    ministry: 'Federal Ministry of Women Affairs',
    agencies: [
      'National Centre for Women Development',
      'National Council for Women\'s Development'
    ]
  },
  {
    id: 'min-31',
    ministry: 'Federal Ministry of Works',
    agencies: [
      'Federal Roads Maintenance Agency (FERMA)',
      'Nigerian Building and Road Research Institute (NBRRI)'
    ]
  },
  {
    id: 'min-32',
    ministry: 'Ministry of Youth Development',
    agencies: [
      'National Youth Service Corps (NYSC)',
      'National Youth Development Agency',
      'National Youth Council'
    ]
  },
  {
    id: 'min-33',
    ministry: 'Federal Capital Territory Administration',
    agencies: [
      'Abuja Metropolitan Management Council',
      'Federal Capital Development Authority (FCDA)',
      'Abuja Environmental Protection Board',
      'Abuja Geographic Information Systems (AGIS)',
      'FCT Water Board',
      'FCT Primary Health Care Board',
      'FCT Education Board',
      'FCT Emergency Management Agency',
      'FCT Internal Revenue Service'
    ]
  }
];
