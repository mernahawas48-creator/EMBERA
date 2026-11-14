
    // =========================================================================
    // 1. EMBEDDED BIOSCAPE DATASET (n = 188 PLOTS)
    // =========================================================================
    const PLOTS_DATA = [
      {"id":"T001","reg":"Vrolijkheid","lat":-33.9597,"lon":19.9022,"erica":0.0,"bare":31.8,"soil":0.0,"rock":0.0,"dead":0.0,"rich":7,"shan":1.61,"park":98,"clean":0,"flag":"Boundary","note":"T001 was right on the boundary between the Karoo matrix and the heuweltjie","gen":["Pentzia","Pteronia","Ruschia"]},
      {"id":"T002","reg":"Vrolijkheid","lat":-33.9173,"lon":19.8842,"erica":0.0,"bare":29.5,"soil":0.0,"rock":0.0,"dead":6.8,"rich":10,"shan":1.95,"park":533,"clean":0,"flag":"Low vegetation","note":"Plot has higher amount of soil compared to surrounding vegetation. In nearby vegetated  patch, 25-40% brown/clay/red soil, but In plot 40-60%","gen":["Ruschia","Hirpicium","Pteronia"]},
      {"id":"T003","reg":"Rooiberg","lat":-33.6392,"lon":21.6517,"erica":0.0,"bare":45.5,"soil":0.0,"rock":2.3,"dead":2.3,"rich":6,"shan":1.59,"park":110,"clean":1,"flag":"","note":"","gen":["Galenia","Mesembryanthemum","Lycium"]},
      {"id":"T004","reg":"Anysberg","lat":-33.4755,"lon":20.6777,"erica":0.0,"bare":34.1,"soil":34.1,"rock":0.0,"dead":0.0,"rich":5,"shan":1.11,"park":126,"clean":1,"flag":"","note":"","gen":["Cynodon","Chrysocoma","Galenia"]},
      {"id":"T007","reg":"Anysberg","lat":-33.4693,"lon":20.7188,"erica":0.0,"bare":59.1,"soil":59.1,"rock":0.0,"dead":0.0,"rich":7,"shan":1.63,"park":215,"clean":1,"flag":"","note":"","gen":["Ruschia","Melolobium","Eriocephalus"]},
      {"id":"T009","reg":"Agulhas","lat":-34.7464,"lon":19.6542,"erica":0.0,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":5,"shan":1.35,"park":211,"clean":1,"flag":"","note":"","gen":["Stipagrostis","Aspalathus","Restio"]},
      {"id":"T012","reg":"Swartberg","lat":-33.3618,"lon":22.0773,"erica":0.0,"bare":9.1,"soil":9.1,"rock":0.0,"dead":0.0,"rich":4,"shan":0.85,"park":82,"clean":0,"flag":"Other","note":"Previously invaded by pines [pine stumps present] likely lowering diversity","gen":["Pteridium","Stoebe","Psoralea"]},
      {"id":"T013","reg":"Swartberg","lat":-33.3633,"lon":22.0652,"erica":0.0,"bare":40.9,"soil":4.5,"rock":18.2,"dead":0.0,"rich":7,"shan":1.7,"park":55,"clean":0,"flag":"Low vegetation","note":"Burned at bottom. Top corner of plot patch  is less burnt. Very rocky.","gen":["Elegia","Restio","Tenaxia"]},
      {"id":"T014","reg":"Swartberg","lat":-33.3581,"lon":22.0542,"erica":43.2,"bare":25.0,"soil":6.8,"rock":18.2,"dead":0.0,"rich":9,"shan":1.98,"park":49,"clean":1,"flag":"","note":"","gen":["Erica","Pentameris","Hypodiscus"]},
      {"id":"T015","reg":"Anysberg","lat":-33.4422,"lon":20.7632,"erica":0.0,"bare":77.3,"soil":0.0,"rock":0.0,"dead":0.0,"rich":3,"shan":0.92,"park":37,"clean":1,"flag":"","note":"","gen":["Hereroa","Pteronia","Felicia"]},
      {"id":"T016","reg":"Anysberg","lat":-33.438,"lon":20.776,"erica":0.0,"bare":65.9,"soil":0.0,"rock":0.0,"dead":0.0,"rich":5,"shan":1.42,"park":45,"clean":1,"flag":"","note":"","gen":["Hereroa","Pteronia","Ruschia"]},
      {"id":"T017","reg":"Agulhas","lat":-34.753,"lon":19.6871,"erica":0.0,"bare":9.1,"soil":9.1,"rock":0.0,"dead":2.3,"rich":9,"shan":1.86,"park":114,"clean":1,"flag":"","note":"","gen":["Agathosma","Metalasia","Passerina"]},
      {"id":"T018","reg":"Agulhas","lat":-34.7364,"lon":19.6635,"erica":9.1,"bare":2.3,"soil":2.3,"rock":0.0,"dead":13.6,"rich":9,"shan":1.83,"park":65,"clean":1,"flag":"","note":"","gen":["Protea","Passerina","Cliffortia"]},
      {"id":"T019","reg":"Agulhas","lat":-34.7094,"lon":20.108,"erica":0.0,"bare":13.6,"soil":13.6,"rock":0.0,"dead":0.0,"rich":8,"shan":1.75,"park":309,"clean":1,"flag":"","note":"","gen":["Restio","Agathosma","Passerina"]},
      {"id":"T020","reg":"Agulhas","lat":-34.719,"lon":19.7678,"erica":15.9,"bare":4.5,"soil":4.5,"rock":0.0,"dead":2.3,"rich":7,"shan":1.74,"park":95,"clean":1,"flag":"","note":"","gen":["Protea","Restio","Leucospermum"]},
      {"id":"T021","reg":"Swartberg","lat":-33.3632,"lon":22.0911,"erica":2.3,"bare":34.1,"soil":22.7,"rock":6.8,"dead":0.0,"rich":11,"shan":1.86,"park":58,"clean":1,"flag":"","note":"","gen":["Mastersiella","Protea","Cannomois"]},
      {"id":"T022","reg":"Agulhas","lat":-34.6354,"lon":19.5836,"erica":65.9,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":7,"shan":1.81,"park":650,"clean":1,"flag":"","note":"","gen":["Erica","Hypodiscus","Aulax"]},
      {"id":"T023","reg":"Agulhas","lat":-34.6747,"lon":20.2294,"erica":0.0,"bare":9.1,"soil":9.1,"rock":0.0,"dead":2.3,"rich":4,"shan":0.88,"park":185,"clean":1,"flag":"","note":"","gen":["Restio","Searsia","Colpoon"]},
      {"id":"T024","reg":"Agulhas","lat":-34.8096,"lon":19.9536,"erica":0.0,"bare":29.5,"soil":29.5,"rock":0.0,"dead":0.0,"rich":7,"shan":1.58,"park":121,"clean":1,"flag":"","note":"","gen":["Passerina","Ficinia","Restio"]},
      {"id":"T026","reg":"Swartberg","lat":-33.3521,"lon":22.0453,"erica":20.5,"bare":50.0,"soil":4.5,"rock":43.2,"dead":0.0,"rich":6,"shan":1.54,"park":76,"clean":1,"flag":"","note":"","gen":["Erica","Tetraria","Protea"]},
      {"id":"T027","reg":"Swartberg","lat":-33.3422,"lon":22.0417,"erica":15.9,"bare":47.7,"soil":13.6,"rock":15.9,"dead":0.0,"rich":8,"shan":1.95,"park":197,"clean":1,"flag":"","note":"","gen":["Erica","Hypodiscus","Elegia"]},
      {"id":"T028","reg":"Swartberg","lat":-33.3368,"lon":22.0374,"erica":0.0,"bare":6.8,"soil":2.3,"rock":0.0,"dead":0.0,"rich":2,"shan":0.26,"park":65,"clean":0,"flag":"Low vegetation","note":"Plot next to road, on gravel spot. Also on edge of vegetation","gen":["Cymbopogon","Stoebe"]},
      {"id":"T029","reg":"Swartberg","lat":-33.344,"lon":22.0219,"erica":0.0,"bare":4.5,"soil":4.5,"rock":0.0,"dead":0.0,"rich":4,"shan":0.77,"park":133,"clean":1,"flag":"","note":"","gen":["Tetraria","Osteospermum","Elegia"]},
      {"id":"T030","reg":"Swartberg","lat":-33.3436,"lon":22.024,"erica":4.5,"bare":38.6,"soil":0.0,"rock":2.3,"dead":0.0,"rich":5,"shan":1.33,"park":80,"clean":0,"flag":"Low vegetation","note":"Very rocky. Rock and soil cover about 60%","gen":["Cannomois","Restio","Hypodiscus"]},
      {"id":"T031","reg":"Swartberg","lat":-33.3322,"lon":22.034,"erica":0.0,"bare":52.3,"soil":4.5,"rock":6.8,"dead":2.3,"rich":10,"shan":2.18,"park":126,"clean":0,"flag":"Low vegetation","note":"Plot is in a bare area compared to surrounding vegetation","gen":["Restio","Aspalathus","Elytropappus"]},
      {"id":"T032","reg":"Swartberg","lat":-33.3253,"lon":22.0378,"erica":0.0,"bare":56.8,"soil":0.0,"rock":11.4,"dead":2.3,"rich":8,"shan":1.73,"park":77,"clean":1,"flag":"","note":"","gen":["Restio","Pentameris","Cannomois"]},
      {"id":"T033","reg":"Swartberg","lat":-33.3185,"lon":22.0429,"erica":0.0,"bare":45.5,"soil":0.0,"rock":9.1,"dead":11.4,"rich":5,"shan":1.28,"park":138,"clean":0,"flag":"Low vegetation","note":"Plot has high rock cover","gen":["Hypodiscus","Cannomois","Aspalathus"]},
      {"id":"T034","reg":"Swartberg","lat":-33.3098,"lon":22.0463,"erica":0.0,"bare":40.9,"soil":0.0,"rock":9.1,"dead":0.0,"rich":6,"shan":1.47,"park":126,"clean":0,"flag":"Other","note":"Power pole adjacent to plot","gen":["Montinia","Aspalathus","Elytropappus"]},
      {"id":"T037","reg":"Rooiberg","lat":-33.6359,"lon":21.677,"erica":0.0,"bare":13.6,"soil":2.3,"rock":0.0,"dead":18.2,"rich":4,"shan":0.7,"park":70,"clean":0,"flag":"Low vegetation","note":"Plot center is bare with one Mesembryanthemum junceum surrounded by thick Portulacaria afra","gen":["Portulacaria","Euphorbia","Aptosimum"]},
      {"id":"T038","reg":"Rooiberg","lat":-33.6821,"lon":21.648,"erica":0.0,"bare":31.8,"soil":22.7,"rock":2.3,"dead":0.0,"rich":10,"shan":1.97,"park":94,"clean":0,"flag":"Low vegetation","note":"Plot with a big bare area at its centers","gen":["Elytropappus","Diosma","Indigofera"]},
      {"id":"T040","reg":"Baviaanskloof","lat":-33.5792,"lon":23.3981,"erica":0.0,"bare":40.9,"soil":0.0,"rock":27.3,"dead":6.8,"rich":5,"shan":1.16,"park":62,"clean":1,"flag":"","note":"","gen":["Hypodiscus","Passerina","Felicia"]},
      {"id":"T041","reg":"Baviaanskloof","lat":-33.5848,"lon":23.401,"erica":0.0,"bare":2.3,"soil":2.3,"rock":0.0,"dead":0.0,"rich":4,"shan":0.6,"park":730,"clean":1,"flag":"","note":"","gen":["Carpobrotus","Elytropappus","Putterlickia"]},
      {"id":"T042","reg":"Baviaanskloof","lat":-33.5854,"lon":23.3976,"erica":2.3,"bare":52.3,"soil":0.0,"rock":25.0,"dead":6.8,"rich":6,"shan":1.37,"park":757,"clean":1,"flag":"","note":"","gen":["Protea","Eriocephalus","Montinia"]},
      {"id":"T043","reg":"Baviaanskloof","lat":-33.5921,"lon":23.4088,"erica":0.0,"bare":50.0,"soil":0.0,"rock":38.6,"dead":9.1,"rich":5,"shan":1.19,"park":1791,"clean":1,"flag":"","note":"","gen":["Dodonaea","Elytropappus","Crassula"]},
      {"id":"T044","reg":"Baviaanskloof","lat":-33.5917,"lon":23.415,"erica":2.3,"bare":61.4,"soil":0.0,"rock":52.3,"dead":4.5,"rich":6,"shan":1.59,"park":2130,"clean":0,"flag":"Low vegetation","note":"Very rocky","gen":["Dodonaea","Hermannia","Pentameris"]},
      {"id":"T045","reg":"Baviaanskloof","lat":-33.5886,"lon":23.4235,"erica":0.0,"bare":59.1,"soil":0.0,"rock":9.1,"dead":15.9,"rich":7,"shan":1.85,"park":2591,"clean":1,"flag":"","note":"","gen":["Helichrysum","Pentameris","Hermannia"]},
      {"id":"T046","reg":"Baviaanskloof","lat":-33.588,"lon":23.428,"erica":0.0,"bare":63.6,"soil":0.0,"rock":18.2,"dead":0.0,"rich":5,"shan":1.41,"park":2953,"clean":0,"flag":"Low vegetation","note":"Very rocky","gen":["Osteospermum","Anthospermum","Cymbopogon"]},
      {"id":"T047","reg":"Baviaanskloof","lat":-33.5987,"lon":23.4092,"erica":0.0,"bare":0.0,"soil":0.0,"rock":0.0,"dead":2.3,"rich":7,"shan":1.53,"park":2450,"clean":1,"flag":"","note":"","gen":["Cliffortia","Carpobrotus","Elegia"]},
      {"id":"T048","reg":"Baviaanskloof","lat":-33.6072,"lon":23.4148,"erica":11.4,"bare":22.7,"soil":9.1,"rock":0.0,"dead":0.0,"rich":8,"shan":1.73,"park":3530,"clean":1,"flag":"","note":"","gen":["Metalasia","Protea","Erica"]},
      {"id":"T049","reg":"Baviaanskloof","lat":-33.5238,"lon":23.448,"erica":0.0,"bare":22.7,"soil":15.9,"rock":2.3,"dead":15.9,"rich":8,"shan":1.94,"park":98,"clean":1,"flag":"","note":"","gen":["Anthospermum","Elytropappus","Dodonaea"]},
      {"id":"T050","reg":"Rooiberg","lat":-33.6636,"lon":21.6404,"erica":0.0,"bare":63.6,"soil":0.0,"rock":11.4,"dead":0.0,"rich":9,"shan":1.99,"park":402,"clean":0,"flag":"Low vegetation","note":"Note presence of large rocky gap on one part of the plot","gen":["Rhodocoma","Aspalathus","Capeochloa"]},
      {"id":"T052","reg":"Outeniqua","lat":-33.8649,"lon":22.0282,"erica":2.3,"bare":36.4,"soil":29.5,"rock":2.3,"dead":9.1,"rich":5,"shan":0.87,"park":104,"clean":0,"flag":"Trampled","note":"Trampling on plot has caused recent mortality.","gen":["Mastersiella","Restio","Staberoha"]},
      {"id":"T055","reg":"Outeniqua","lat":-33.8804,"lon":22.4388,"erica":4.5,"bare":15.9,"soil":15.9,"rock":0.0,"dead":0.0,"rich":9,"shan":1.89,"park":88,"clean":1,"flag":"","note":"","gen":["Berzelia","Watsonia","Restio"]},
      {"id":"T056","reg":"Outeniqua","lat":-33.8835,"lon":22.4287,"erica":29.5,"bare":29.5,"soil":20.5,"rock":9.1,"dead":9.1,"rich":8,"shan":1.81,"park":227,"clean":1,"flag":"","note":"","gen":["Erica","Tetraria","Watsonia"]},
      {"id":"T058","reg":"Outeniqua","lat":-33.9183,"lon":22.4157,"erica":59.1,"bare":20.5,"soil":15.9,"rock":4.5,"dead":0.0,"rich":8,"shan":1.48,"park":67,"clean":1,"flag":"","note":"","gen":["Erica","Cymbopogon","Restio"]},
      {"id":"T059","reg":"Outeniqua","lat":-33.8725,"lon":22.0302,"erica":9.1,"bare":38.6,"soil":13.6,"rock":0.0,"dead":0.0,"rich":11,"shan":2.21,"park":109,"clean":1,"flag":"","note":"","gen":["Berzelia","Erica","Cymbopogon"]},
      {"id":"T062","reg":"Rooiberg","lat":-33.6511,"lon":21.6421,"erica":0.0,"bare":40.9,"soil":0.0,"rock":18.2,"dead":6.8,"rich":6,"shan":1.4,"park":58,"clean":1,"flag":"","note":"","gen":["Pteronia","Ruschia","Smelly asteraceous thing"]},
      {"id":"T063","reg":"Vrolijkheid","lat":-33.9348,"lon":19.8965,"erica":0.0,"bare":54.5,"soil":0.0,"rock":0.0,"dead":0.0,"rich":6,"shan":1.58,"park":327,"clean":0,"flag":"Boundary","note":"Plot on intermediate zone between vegetation types, plus on a soil washout as well;","gen":["Crassula","Pentzia","Ruschia"]},
      {"id":"T064","reg":"Baviaanskloof","lat":-33.6031,"lon":23.3537,"erica":0.0,"bare":59.1,"soil":0.0,"rock":34.1,"dead":2.3,"rich":6,"shan":1.63,"park":21,"clean":0,"flag":"Low vegetation","note":"75-80% rock","gen":["Felicia","Wahlenbergia","Elytropappus"]},
      {"id":"T066","reg":"Grootbos","lat":-34.5359,"lon":19.4123,"erica":0.0,"bare":11.4,"soil":11.4,"rock":0.0,"dead":15.9,"rich":7,"shan":1.51,"park":141,"clean":1,"flag":"","note":"","gen":["Passerina","Restio","Indigofera"]},
      {"id":"T067","reg":"Grootbos","lat":-34.5422,"lon":19.4075,"erica":0.0,"bare":6.8,"soil":6.8,"rock":0.0,"dead":0.0,"rich":7,"shan":1.44,"park":57,"clean":1,"flag":"","note":"","gen":["Cassine","Olea","Otholobium"]},
      {"id":"T068","reg":"Cape Point","lat":-34.3246,"lon":18.4454,"erica":13.6,"bare":2.3,"soil":2.3,"rock":0.0,"dead":15.9,"rich":5,"shan":1.06,"park":150,"clean":0,"flag":"Boundary","note":"Plot is right on edge of Elegia patch and Berzelia patch","gen":["Elegia","Berzelia","Erica"]},
      {"id":"T069","reg":"Cape Point","lat":-33.9485,"lon":18.4022,"erica":9.1,"bare":2.3,"soil":0.0,"rock":2.3,"dead":11.4,"rich":8,"shan":1.84,"park":14091,"clean":1,"flag":"","note":"","gen":["Passerina","Adenandra","Restio"]},
      {"id":"T070","reg":"Cape Point","lat":-34.0794,"lon":18.3971,"erica":22.7,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":15,"shan":2.52,"park":585,"clean":1,"flag":"","note":"","gen":["Erica","Restio","Willdenowia"]},
      {"id":"T071","reg":"Cape Point","lat":-34.1252,"lon":18.4361,"erica":0.0,"bare":4.5,"soil":4.5,"rock":0.0,"dead":6.8,"rich":10,"shan":2.13,"park":154,"clean":1,"flag":"","note":"","gen":["Elytropappus","Passerina","Pseudopentameris"]},
      {"id":"T072","reg":"Cape Point","lat":-33.9641,"lon":18.4123,"erica":0.0,"bare":0.0,"soil":0.0,"rock":0.0,"dead":52.3,"rich":2,"shan":0.49,"park":12394,"clean":0,"flag":"Low vegetation","note":"Elegia mucranata non-photosynthetic vegetation is 40-60 of plot","gen":["Elegia","Anthochortus"]},
      {"id":"T074","reg":"Cape Point","lat":-34.3054,"lon":18.438,"erica":0.0,"bare":6.8,"soil":6.8,"rock":0.0,"dead":11.4,"rich":12,"shan":2.26,"park":106,"clean":0,"flag":"Boundary","note":"Plot is on edge of huge Leucadendron coniferum patch","gen":["Metalasia","Restio","Oedera"]},
      {"id":"T075","reg":"Cape Point","lat":-34.0947,"lon":18.4585,"erica":4.5,"bare":11.4,"soil":6.8,"rock":4.5,"dead":25.0,"rich":7,"shan":1.5,"park":158,"clean":1,"flag":"","note":"","gen":["Protea","Thamnochortus","Elytropappus"]},
      {"id":"T076","reg":"Cape Point","lat":-34.3317,"lon":18.4631,"erica":11.4,"bare":15.9,"soil":15.9,"rock":0.0,"dead":13.6,"rich":9,"shan":1.73,"park":1260,"clean":1,"flag":"","note":"","gen":["Euclea","Erica","Thamnochortus"]},
      {"id":"T077","reg":"Cape Point","lat":-34.2933,"lon":18.4283,"erica":9.1,"bare":20.5,"soil":18.2,"rock":2.3,"dead":6.8,"rich":9,"shan":1.86,"park":1509,"clean":0,"flag":"Low vegetation","note":"Big rock on one side of plot, lots of sand on the other side. Intermediate area is 60-75% rock/sand","gen":["Restio","Agathosma","Leucadendron"]},
      {"id":"T078","reg":"West Coast","lat":-33.2225,"lon":18.1077,"erica":0.0,"bare":18.2,"soil":18.2,"rock":0.0,"dead":0.0,"rich":11,"shan":2.14,"park":107,"clean":1,"flag":"","note":"","gen":["Gymnosporia","Euphorbia","Helichrysum"]},
      {"id":"T079","reg":"Cape Point","lat":-34.2604,"lon":18.4542,"erica":18.2,"bare":4.5,"soil":4.5,"rock":0.0,"dead":15.9,"rich":4,"shan":1.1,"park":336,"clean":0,"flag":"Other","note":"Note that Leucadendron and Proteas are nearby but not on the plot","gen":["Metalasia","Erica","Stoebe"]},
      {"id":"T080","reg":"Cape Point","lat":-33.9374,"lon":18.394,"erica":2.3,"bare":11.4,"soil":6.8,"rock":4.5,"dead":0.0,"rich":7,"shan":1.55,"park":15337,"clean":1,"flag":"","note":"","gen":["Metalasia","Protea","Muraltia"]},
      {"id":"T081","reg":"Cape Point","lat":-34.2885,"lon":18.4477,"erica":52.3,"bare":6.8,"soil":0.0,"rock":4.5,"dead":13.6,"rich":11,"shan":1.74,"park":174,"clean":1,"flag":"","note":"","gen":["Erica","Diastella","Elegia"]},
      {"id":"T082","reg":"Cape Point","lat":-33.9638,"lon":18.3861,"erica":0.0,"bare":2.3,"soil":2.3,"rock":0.0,"dead":6.8,"rich":11,"shan":2.15,"park":12466,"clean":1,"flag":"","note":"","gen":["Protea","Anthospermum","Watsonia"]},
      {"id":"T083","reg":"West Coast","lat":-33.2018,"lon":18.1403,"erica":0.0,"bare":6.8,"soil":6.8,"rock":0.0,"dead":11.4,"rich":8,"shan":1.68,"park":196,"clean":1,"flag":"","note":"","gen":["Anthospermum","Willdenowia","Gymnosporia"]},
      {"id":"T084","reg":"West Coast","lat":-33.5699,"lon":18.3766,"erica":0.0,"bare":31.8,"soil":31.8,"rock":0.0,"dead":4.5,"rich":9,"shan":1.9,"park":75,"clean":1,"flag":"","note":"","gen":["Ficinia","Diosma","Senecio"]},
      {"id":"T085","reg":"Cape Point","lat":-34.3118,"lon":18.4294,"erica":61.4,"bare":4.5,"soil":4.5,"rock":0.0,"dead":0.0,"rich":6,"shan":1.46,"park":1093,"clean":1,"flag":"","note":"","gen":["Erica","Elegia","Cliffortia"]},
      {"id":"T087","reg":"West Coast","lat":-33.226,"lon":18.1391,"erica":0.0,"bare":45.5,"soil":45.5,"rock":0.0,"dead":6.8,"rich":7,"shan":1.62,"park":214,"clean":0,"flag":"Low vegetation","note":"The plot center is in an especially open area adjacent to more continuous vegetation","gen":["Passerina","Eriocephalus","Helichrysum"]},
      {"id":"T088","reg":"West Coast","lat":-33.2473,"lon":18.1938,"erica":0.0,"bare":22.7,"soil":22.7,"rock":0.0,"dead":9.1,"rich":13,"shan":2.27,"park":232,"clean":1,"flag":"","note":"","gen":["Limonium","Eriocephalus","Putterlickia"]},
      {"id":"T089","reg":"Cape Point","lat":-34.0855,"lon":18.4205,"erica":27.3,"bare":6.8,"soil":6.8,"rock":0.0,"dead":2.3,"rich":6,"shan":1.32,"park":189,"clean":1,"flag":"","note":"","gen":["Leucadendron","Erica","Protea"]},
      {"id":"T091","reg":"West Coast","lat":-33.23,"lon":18.1639,"erica":0.0,"bare":25.0,"soil":25.0,"rock":0.0,"dead":0.0,"rich":10,"shan":2.08,"park":513,"clean":1,"flag":"","note":"","gen":["Agathosma","Colpoon","Tribolium"]},
      {"id":"T092","reg":"Cape Point","lat":-34.0816,"lon":18.4008,"erica":9.1,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":5,"shan":0.76,"park":715,"clean":1,"flag":"","note":"","gen":["Leucadendron","Erica","Berzelia"]},
      {"id":"T093","reg":"Cape Point","lat":-34.25,"lon":18.4128,"erica":2.3,"bare":15.9,"soil":15.9,"rock":0.0,"dead":6.8,"rich":12,"shan":2.15,"park":4312,"clean":1,"flag":"","note":"","gen":["Restio","Elegia","Diastella"]},
      {"id":"T094","reg":"Cape Point","lat":-33.9518,"lon":18.4559,"erica":2.3,"bare":31.8,"soil":31.8,"rock":0.0,"dead":0.0,"rich":11,"shan":2.06,"park":14628,"clean":0,"flag":"Low vegetation","note":"Rhodes memorial, bare soil at center of plot (25-40% soil); denser on either side","gen":["Aristea","Cliffortia","Pelargonium"]},
      {"id":"T095","reg":"West Coast","lat":-33.5887,"lon":18.3679,"erica":0.0,"bare":27.3,"soil":27.3,"rock":0.0,"dead":0.0,"rich":13,"shan":2.31,"park":82,"clean":1,"flag":"","note":"","gen":["Eriocephalus","Pterocelastrus","Euphorbia"]},
      {"id":"T096","reg":"Cape Point","lat":-34.1825,"lon":18.4052,"erica":25.0,"bare":25.0,"soil":18.2,"rock":5.7,"dead":1.1,"rich":24,"shan":2.79,"park":236,"clean":1,"flag":"","note":"","gen":["Erica","Thamnochortus","Cullumia"]},
      {"id":"T097","reg":"Cape Point","lat":-34.2387,"lon":18.3865,"erica":18.2,"bare":45.5,"soil":13.6,"rock":31.8,"dead":2.3,"rich":16,"shan":2.58,"park":6664,"clean":0,"flag":"Low vegetation","note":"On 80% rock","gen":["Erica","Restio","Tetraria"]},
      {"id":"T098","reg":"Cape Point","lat":-34.2074,"lon":18.4526,"erica":0.0,"bare":2.3,"soil":0.0,"rock":2.3,"dead":6.8,"rich":13,"shan":2.27,"park":5077,"clean":1,"flag":"","note":"","gen":["Protea","Leucadendron","Restio"]},
      {"id":"T103","reg":"Anysberg","lat":-33.4797,"lon":20.5146,"erica":0.0,"bare":70.5,"soil":0.0,"rock":20.5,"dead":4.5,"rich":7,"shan":1.84,"park":92,"clean":1,"flag":"","note":"","gen":["Crassula","Galenia","Lycium"]},
      {"id":"T104","reg":"Anysberg","lat":-33.4694,"lon":20.563,"erica":0.0,"bare":15.9,"soil":15.9,"rock":0.0,"dead":9.1,"rich":6,"shan":1.43,"park":75,"clean":1,"flag":"","note":"","gen":["Galenia","Chaenostoma","Ruschia"]},
      {"id":"T105","reg":"Anysberg","lat":-33.4662,"lon":20.5777,"erica":27.3,"bare":45.5,"soil":45.5,"rock":0.0,"dead":15.9,"rich":5,"shan":1.27,"park":73,"clean":0,"flag":"Grazing","note":"Much evidence of grazing on this plot","gen":["Erica","Ficinia","Ehrharta"]},
      {"id":"T106","reg":"Anysberg","lat":-33.4711,"lon":20.6191,"erica":0.0,"bare":47.7,"soil":0.0,"rock":4.5,"dead":20.5,"rich":4,"shan":0.99,"park":105,"clean":0,"flag":"Low vegetation","note":"plot is 45% rock and soils","gen":["Elytropappus","Ruschia","Helichrysum"]},
      {"id":"T107","reg":"Anysberg","lat":-33.4705,"lon":20.6396,"erica":0.0,"bare":72.7,"soil":72.7,"rock":0.0,"dead":0.0,"rich":5,"shan":1.47,"park":76,"clean":1,"flag":"","note":"","gen":["Pteronia","Ruschia","Pentzia"]},
      {"id":"T108","reg":"Anysberg","lat":-33.4437,"lon":20.8077,"erica":0.0,"bare":34.1,"soil":0.0,"rock":29.5,"dead":6.8,"rich":9,"shan":1.97,"park":67,"clean":1,"flag":"","note":"","gen":["Leipoldtia","Ruschia","Rhigozum"]},
      {"id":"T109","reg":"Anysberg","lat":-33.4518,"lon":20.8534,"erica":0.0,"bare":56.8,"soil":11.4,"rock":20.5,"dead":0.0,"rich":5,"shan":1.57,"park":316,"clean":1,"flag":"","note":"","gen":["Passerina","Ruschia","Elytropappus"]},
      {"id":"T112","reg":"De Hoop","lat":-34.4429,"lon":20.4201,"erica":0.0,"bare":9.1,"soil":4.5,"rock":0.0,"dead":6.8,"rich":6,"shan":1.22,"park":123,"clean":0,"flag":"Boundary","note":"Problematic plot location, half is located on edge of big Leucadendron meridianum patch","gen":["Euchaetis","Thamnochortus","Leucadendron"]},
      {"id":"T114","reg":"De Hoop","lat":-34.4134,"lon":20.6319,"erica":27.3,"bare":13.6,"soil":9.1,"rock":0.0,"dead":13.6,"rich":8,"shan":1.73,"park":674,"clean":1,"flag":"","note":"","gen":["Erica","Aulax","Thamnochortus"]},
      {"id":"T117","reg":"Langeberg","lat":-33.959,"lon":21.2302,"erica":15.9,"bare":29.5,"soil":13.6,"rock":0.0,"dead":2.3,"rich":9,"shan":1.94,"park":45,"clean":1,"flag":"","note":"","gen":["Tetraria","Erica","Hypodiscus"]},
      {"id":"T119","reg":"De Hoop","lat":-34.4232,"lon":20.4095,"erica":9.1,"bare":22.7,"soil":0.0,"rock":20.5,"dead":9.1,"rich":7,"shan":1.64,"park":141,"clean":1,"flag":"","note":"","gen":["Leucadendron","Protea","Acmadenia"]},
      {"id":"T123","reg":"De Hoop","lat":-34.4133,"lon":20.5954,"erica":27.3,"bare":13.6,"soil":11.4,"rock":2.3,"dead":13.6,"rich":12,"shan":2.08,"park":109,"clean":1,"flag":"","note":"","gen":["Erica","Cliffortia","Penaea"]},
      {"id":"T124","reg":"De Hoop","lat":-34.4084,"lon":20.6234,"erica":6.8,"bare":22.7,"soil":20.5,"rock":2.3,"dead":2.3,"rich":9,"shan":1.93,"park":1444,"clean":1,"flag":"","note":"","gen":["Protea","Mastersiella","Serruria"]},
      {"id":"T128","reg":"De Hoop","lat":-34.4095,"lon":20.5777,"erica":47.7,"bare":11.4,"soil":11.4,"rock":0.0,"dead":2.3,"rich":6,"shan":1.52,"park":52,"clean":1,"flag":"","note":"","gen":["Erica","Berzelia","Morella"]},
      {"id":"T132","reg":"De Hoop","lat":-34.4493,"lon":20.4119,"erica":15.9,"bare":27.3,"soil":2.3,"rock":9.1,"dead":2.3,"rich":9,"shan":1.85,"park":159,"clean":1,"flag":"","note":"","gen":["Thamnochortus","Erica","Coleonema"]},
      {"id":"T135","reg":"De Hoop","lat":-34.4737,"lon":20.5026,"erica":0.0,"bare":4.5,"soil":4.5,"rock":0.0,"dead":13.6,"rich":10,"shan":2.09,"park":114,"clean":1,"flag":"","note":"","gen":["Agathosma","Eriocephalus","Helichrysum"]},
      {"id":"T136","reg":"Langeberg","lat":-33.9787,"lon":21.2194,"erica":31.8,"bare":18.2,"soil":18.2,"rock":0.0,"dead":2.3,"rich":10,"shan":1.91,"park":63,"clean":1,"flag":"","note":"","gen":["Erica","Cliffortia","Leucadendron"]},
      {"id":"T137","reg":"De Hoop","lat":-34.461,"lon":20.4269,"erica":45.5,"bare":18.2,"soil":0.0,"rock":0.0,"dead":2.3,"rich":6,"shan":1.3,"park":60,"clean":1,"flag":"","note":"","gen":["Erica","Leucadendron","Thamnochortus"]},
      {"id":"T138","reg":"Bontebok","lat":-34.0714,"lon":20.4391,"erica":0.0,"bare":11.4,"soil":11.4,"rock":0.0,"dead":0.0,"rich":5,"shan":1.23,"park":44,"clean":1,"flag":"","note":"","gen":["Tenaxia","Thamnochortus","Triraphis"]},
      {"id":"T147","reg":"Gardenroute","lat":-33.99,"lon":22.6632,"erica":9.1,"bare":13.6,"soil":13.6,"rock":0.0,"dead":9.1,"rich":5,"shan":1.37,"park":126,"clean":1,"flag":"","note":"","gen":["Helichrysum","Passerina","Anthospermum"]},
      {"id":"T148","reg":"Gardenroute","lat":-33.9811,"lon":22.7141,"erica":9.1,"bare":2.3,"soil":2.3,"rock":0.0,"dead":0.0,"rich":11,"shan":2.08,"park":506,"clean":0,"flag":"Boundary","note":"Plot is on the edge of two vegetation types","gen":["Imperata","Searsia","Helichrysum"]},
      {"id":"T149","reg":"Gardenroute","lat":-33.9159,"lon":22.9574,"erica":0.0,"bare":0.0,"soil":0.0,"rock":0.0,"dead":4.5,"rich":4,"shan":0.98,"park":114,"clean":1,"flag":"","note":"","gen":["Poaceae","Calodendrum","Podocarpus"]},
      {"id":"T161","reg":"Gardenroute","lat":-33.8998,"lon":22.9741,"erica":0.0,"bare":0.0,"soil":0.0,"rock":0.0,"dead":18.2,"rich":6,"shan":0.92,"park":87,"clean":1,"flag":"","note":"","gen":["Calodendrum","Afrocarpus","Dietes"]},
      {"id":"T164","reg":"West Coast","lat":-33.1981,"lon":18.0864,"erica":0.0,"bare":4.5,"soil":4.5,"rock":0.0,"dead":4.5,"rich":14,"shan":2.34,"park":159,"clean":1,"flag":"","note":"","gen":["Willdenowia","Helichrysum","Eriocephalus"]},
      {"id":"T166","reg":"Cederberg","lat":-32.5292,"lon":19.3412,"erica":0.0,"bare":29.5,"soil":18.2,"rock":11.4,"dead":22.7,"rich":8,"shan":1.84,"park":56353,"clean":1,"flag":"","note":"","gen":["Ehrharta","Othonna","Passerina"]},
      {"id":"T168","reg":"Cederberg","lat":-32.5352,"lon":19.3318,"erica":0.0,"bare":36.4,"soil":11.4,"rock":25.0,"dead":11.4,"rich":11,"shan":2.22,"park":55353,"clean":1,"flag":"","note":"","gen":["Passerina","Cliffortia","Restio"]},
      {"id":"T169","reg":"Cederberg","lat":-32.1412,"lon":18.9425,"erica":0.0,"bare":34.1,"soil":34.1,"rock":0.0,"dead":18.2,"rich":7,"shan":1.57,"park":562,"clean":0,"flag":"Accessibility","note":"On private property","gen":["Thamnochortus","Macrostylis","Tetraria"]},
      {"id":"T170","reg":"Cederberg","lat":-32.35,"lon":19.015,"erica":0.0,"bare":2.3,"soil":0.0,"rock":2.3,"dead":4.5,"rich":10,"shan":1.92,"park":24130,"clean":1,"flag":"","note":"","gen":["Leucadendron","Phylica","Elytropappus"]},
      {"id":"T171","reg":"Cederberg","lat":-32.1509,"lon":19.0267,"erica":0.0,"bare":25.0,"soil":25.0,"rock":0.0,"dead":0.0,"rich":9,"shan":1.87,"park":7463,"clean":0,"flag":"Other","note":"A lot of Cannamois robusta in the area, one of the key dominants. However, there were no plots with it as a dominant or even major component; it will be very dominant and prominant in imagery","gen":["Thamnochortus","Willdenowia","Cymbopogon"]},
      {"id":"T172","reg":"West Coast","lat":-33.1386,"lon":18.0995,"erica":0.0,"bare":38.6,"soil":38.6,"rock":0.0,"dead":0.0,"rich":12,"shan":2.29,"park":198,"clean":1,"flag":"","note":"","gen":["Helichrysum","Salvia","Osteospermum"]},
      {"id":"T173","reg":"West Coast","lat":-33.1632,"lon":18.1279,"erica":0.0,"bare":13.6,"soil":13.6,"rock":0.0,"dead":18.2,"rich":12,"shan":2.32,"park":106,"clean":1,"flag":"","note":"","gen":["Eriocephalus","Euphorbia","Anthospermum"]},
      {"id":"T175","reg":"West Coast","lat":-33.1191,"lon":18.0632,"erica":0.0,"bare":22.7,"soil":20.5,"rock":2.3,"dead":4.5,"rich":13,"shan":2.32,"park":160,"clean":1,"flag":"","note":"","gen":["Gymnosporia","Osteospermum","Roepera"]},
      {"id":"T176","reg":"West Coast","lat":-33.1133,"lon":18.0748,"erica":0.0,"bare":2.3,"soil":2.3,"rock":0.0,"dead":15.9,"rich":10,"shan":1.9,"park":119,"clean":0,"flag":"Low vegetation","note":"A fair amount of non-photosynthetic vegetation cover at site","gen":["Willdenowia","Othonna","Stachys"]},
      {"id":"T177","reg":"West Coast","lat":-33.1531,"lon":18.1212,"erica":0.0,"bare":27.3,"soil":27.3,"rock":0.0,"dead":0.0,"rich":7,"shan":1.78,"park":60,"clean":1,"flag":"","note":"","gen":["Asparagus","Olea","Dasispermum"]},
      {"id":"T178","reg":"West Coast","lat":-33.1259,"lon":18.061,"erica":0.0,"bare":15.9,"soil":15.9,"rock":0.0,"dead":4.5,"rich":12,"shan":2.13,"park":72,"clean":1,"flag":"","note":"","gen":["Willdenowia","Gymnosporia","Eriocephalus"]},
      {"id":"T179","reg":"Cederberg","lat":-32.3455,"lon":19.0329,"erica":0.0,"bare":6.8,"soil":4.5,"rock":2.3,"dead":0.0,"rich":8,"shan":1.25,"park":24145,"clean":1,"flag":"","note":"","gen":["Hypodiscus","Cannomois","Acrosanthes"]},
      {"id":"T180","reg":"West Coast","lat":-33.1736,"lon":18.1374,"erica":0.0,"bare":6.8,"soil":6.8,"rock":0.0,"dead":6.8,"rich":13,"shan":2.35,"park":177,"clean":1,"flag":"","note":"","gen":["Eriocephalus","Asparagus","Euclea"]},
      {"id":"T181","reg":"West Coast","lat":-33.1185,"lon":18.0768,"erica":0.0,"bare":4.5,"soil":4.5,"rock":0.0,"dead":2.3,"rich":9,"shan":1.52,"park":86,"clean":1,"flag":"","note":"","gen":["Willdenowia","Ehrharta","Clutia"]},
      {"id":"T182","reg":"West Coast","lat":-33.1476,"lon":18.0121,"erica":0.0,"bare":11.4,"soil":11.4,"rock":0.0,"dead":6.8,"rich":6,"shan":1.56,"park":160,"clean":1,"flag":"","note":"","gen":["Euclea","Pelargonium","Osteospermum"]},
      {"id":"T183","reg":"West Coast","lat":-33.2077,"lon":18.0942,"erica":0.0,"bare":20.5,"soil":20.5,"rock":0.0,"dead":0.0,"rich":10,"shan":2.06,"park":473,"clean":1,"flag":"","note":"","gen":["Putterlickia","Asparagus","Eriocephalus"]},
      {"id":"T184","reg":"West Coast","lat":-33.117,"lon":18.086,"erica":0.0,"bare":22.7,"soil":22.7,"rock":0.0,"dead":0.0,"rich":9,"shan":1.77,"park":107,"clean":1,"flag":"","note":"","gen":["Willdenowia","Osteospermum","Eriocephalus"]},
      {"id":"T185","reg":"Outeniqua","lat":-33.9088,"lon":22.0236,"erica":6.8,"bare":20.5,"soil":2.3,"rock":13.6,"dead":0.0,"rich":13,"shan":2.35,"park":32,"clean":1,"flag":"","note":"","gen":["Psoralea","Pteridium","Metalasia"]},
      {"id":"T186","reg":"Langeberg","lat":-33.9471,"lon":21.2274,"erica":25.0,"bare":11.4,"soil":11.4,"rock":0.0,"dead":13.6,"rich":8,"shan":1.93,"park":40,"clean":0,"flag":"Trampled","note":"Plot was pretty trampled","gen":["Erica","Elegia","Protea"]},
      {"id":"T187","reg":"Bontebok","lat":-34.065,"lon":20.4394,"erica":0.0,"bare":22.7,"soil":22.7,"rock":0.0,"dead":4.5,"rich":2,"shan":0.58,"park":85,"clean":1,"flag":"","note":"","gen":["Elytropappus","Restio"]},
      {"id":"T188","reg":"Bontebok","lat":-34.0727,"lon":20.4506,"erica":0.0,"bare":36.4,"soil":36.4,"rock":0.0,"dead":0.0,"rich":11,"shan":2.24,"park":71,"clean":0,"flag":"Boundary","note":"Plot is on edge of two vegetation types. Center of plot in middle of big Olea.","gen":["Adenogramma","Ursinia","Hermannia"]},
      {"id":"T190","reg":"Franschoekpass","lat":-33.9379,"lon":19.1639,"erica":0.0,"bare":61.4,"soil":43.2,"rock":18.2,"dead":0.0,"rich":13,"shan":2.48,"park":23015,"clean":1,"flag":"","note":"","gen":["Tetraria","Pentameris","Bobartia"]},
      {"id":"T191","reg":"Kogelberg","lat":-34.3247,"lon":18.8454,"erica":18.2,"bare":25.0,"soil":11.4,"rock":13.6,"dead":0.0,"rich":13,"shan":2.46,"park":6224,"clean":1,"flag":"","note":"","gen":["Erica","Tetraria","Elegia"]},
      {"id":"T193","reg":"Houwhoekpass","lat":-34.2105,"lon":19.1614,"erica":11.4,"bare":11.4,"soil":2.3,"rock":9.1,"dead":0.0,"rich":17,"shan":2.59,"park":20373,"clean":0,"flag":"Low vegetation","note":"Burnt","gen":["Leucospermum","Willdenowia","Erica"]},
      {"id":"T195","reg":"Cape Point","lat":-33.9629,"lon":18.411,"erica":0.0,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":3,"shan":0.55,"park":12517,"clean":1,"flag":"","note":"","gen":["Anthochortus","Restio"]},
      {"id":"T196","reg":"Kogelberg","lat":-34.2896,"lon":19.1138,"erica":29.5,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":13,"shan":2.27,"park":11926,"clean":1,"flag":"","note":"","gen":["Erica","Protea","Leucadendron"]},
      {"id":"T198","reg":"Viljoenspass","lat":-34.0756,"lon":19.0618,"erica":0.0,"bare":2.3,"soil":2.3,"rock":0.0,"dead":2.3,"rich":9,"shan":1.69,"park":29001,"clean":0,"flag":"Other","note":"Recovered fynbos, eucalyptus stumps, was cut out; acacias and pines are starting to reappear; note big gap in proteas away from plot towards road","gen":["Protea","Stoebe","Restio"]},
      {"id":"T199","reg":"Houwhoekpass","lat":-34.2179,"lon":19.1723,"erica":29.5,"bare":2.3,"soil":2.3,"rock":0.0,"dead":0.0,"rich":14,"shan":2.09,"park":20632,"clean":1,"flag":"","note":"","gen":["Erica","Hypodiscus","Penaea"]},
      {"id":"T200","reg":"Viljoenspass","lat":-34.0883,"lon":19.0563,"erica":6.8,"bare":4.5,"soil":2.3,"rock":2.3,"dead":0.0,"rich":11,"shan":2.03,"park":27517,"clean":0,"flag":"Other","note":"Rock prominent. 10-25% for both soil and rock. Closer to 10% rock and 20% soil","gen":["Metalasia","Lanaria","Restio"]},
      {"id":"T201","reg":"Cape Point","lat":-33.9593,"lon":18.4061,"erica":38.6,"bare":15.9,"soil":0.0,"rock":15.9,"dead":0.0,"rich":4,"shan":0.9,"park":12891,"clean":1,"flag":"","note":"","gen":["Elegia","Erica","Thamnochortus"]},
      {"id":"T202","reg":"Franschoekpass","lat":-33.9196,"lon":19.1617,"erica":9.1,"bare":0.0,"soil":0.0,"rock":0.0,"dead":27.3,"rich":9,"shan":1.46,"park":20972,"clean":0,"flag":"Boundary","note":"Plot is on edge of Protea vs. Berzelia dominance. Note that actual plot is on a raised area above a seep","gen":["Protea","Erica","Cassytha"]},
      {"id":"T204","reg":"Kogelberg","lat":-34.3298,"lon":18.9961,"erica":25.0,"bare":2.3,"soil":0.0,"rock":2.3,"dead":0.0,"rich":10,"shan":1.91,"park":230,"clean":1,"flag":"","note":"","gen":["Leucadendron","Erica","Elegia"]},
      {"id":"T206","reg":"Kogelberg","lat":-34.2905,"lon":18.8236,"erica":6.8,"bare":9.1,"soil":4.5,"rock":4.5,"dead":4.5,"rich":11,"shan":1.65,"park":10157,"clean":1,"flag":"","note":"","gen":["Elegia","Adenandra","Erica"]},
      {"id":"T209","reg":"Kogelberg","lat":-34.3393,"lon":18.9857,"erica":13.6,"bare":6.8,"soil":6.8,"rock":0.0,"dead":13.6,"rich":9,"shan":2.06,"park":1244,"clean":1,"flag":"","note":"","gen":["Hypodiscus","Thamnochortus","Erica"]},
      {"id":"T211","reg":"Franschoekpass","lat":-33.9228,"lon":19.1583,"erica":6.8,"bare":4.5,"soil":4.5,"rock":0.0,"dead":0.0,"rich":13,"shan":1.86,"park":21277,"clean":1,"flag":"","note":"","gen":["Anaxeton","Pentameris","Staberoha"]},
      {"id":"T212","reg":"Viljoenspass","lat":-34.0703,"lon":19.0684,"erica":38.6,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":13,"shan":1.91,"park":29715,"clean":1,"flag":"","note":"","gen":["Erica","Leucadendron","Lanaria"]},
      {"id":"T213","reg":"Kogelberg","lat":-34.3536,"lon":18.9035,"erica":18.2,"bare":6.8,"soil":6.8,"rock":0.0,"dead":6.8,"rich":10,"shan":2.04,"park":66,"clean":1,"flag":"","note":"","gen":["Willdenowia","Erica","Elegia"]},
      {"id":"T215","reg":"Kogelberg","lat":-34.3538,"lon":18.8375,"erica":9.1,"bare":6.8,"soil":0.0,"rock":6.8,"dead":4.5,"rich":15,"shan":2.54,"park":6020,"clean":1,"flag":"","note":"","gen":["Themeda","Ficinia","Pterocelastrus"]},
      {"id":"T216","reg":"Franschoekpass","lat":-33.9521,"lon":19.1756,"erica":18.2,"bare":4.5,"soil":0.0,"rock":4.5,"dead":0.0,"rich":14,"shan":2.4,"park":24761,"clean":1,"flag":"","note":"","gen":["Pentameris","Tetraria","Erica"]},
      {"id":"T217","reg":"Kogelberg","lat":-34.2871,"lon":19.1105,"erica":45.5,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":14,"shan":2.35,"park":11761,"clean":0,"flag":"Removed invasive","note":"Doug cut down a small pine that would have been in the image","gen":["Erica","Serruria","Diastella"]},
      {"id":"T218","reg":"Bainskloof","lat":-33.6141,"lon":19.1008,"erica":36.4,"bare":27.3,"soil":4.5,"rock":4.5,"dead":0.0,"rich":6,"shan":1.37,"park":292,"clean":1,"flag":"","note":"","gen":["Erica","Thamnochortus","Askidiosperma"]},
      {"id":"T219","reg":"Bainskloof","lat":-33.5923,"lon":19.1237,"erica":70.5,"bare":20.5,"soil":0.0,"rock":0.0,"dead":0.0,"rich":4,"shan":0.76,"park":49,"clean":0,"flag":"Accessibility","note":"Very steep plot","gen":["Erica","Berzelia","Metrosideros"]},
      {"id":"T220","reg":"Bainskloof","lat":-33.6231,"lon":19.0991,"erica":25.0,"bare":22.7,"soil":0.0,"rock":4.5,"dead":0.0,"rich":11,"shan":2.05,"park":391,"clean":0,"flag":"Trampled","note":"Plot center is highly trampled","gen":["Erica","Willdenowia","Askidiosperma"]},
      {"id":"T221","reg":"Kogelberg","lat":-34.3276,"lon":19.0296,"erica":0.0,"bare":52.3,"soil":11.4,"rock":40.9,"dead":0.0,"rich":12,"shan":2.31,"park":3314,"clean":1,"flag":"","note":"","gen":["Tetraria","Elegia","Geochloa"]},
      {"id":"T222","reg":"Kogelberg","lat":-34.295,"lon":19.1173,"erica":6.8,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":8,"shan":1.73,"park":12014,"clean":1,"flag":"","note":"","gen":["Elegia","Neesenbeckia","Ficinia"]},
      {"id":"T223","reg":"Kogelberg","lat":-34.2955,"lon":19.1231,"erica":27.3,"bare":4.5,"soil":4.5,"rock":0.0,"dead":9.1,"rich":11,"shan":2.0,"park":12504,"clean":1,"flag":"","note":"","gen":["Restio","Erica","Mimetes"]},
      {"id":"T224","reg":"Kogelberg","lat":-34.3536,"lon":18.8841,"erica":36.4,"bare":6.8,"soil":6.8,"rock":0.0,"dead":0.0,"rich":12,"shan":2.1,"park":1739,"clean":1,"flag":"","note":"","gen":["Erica","Restio","Elegia"]},
      {"id":"T226","reg":"Bainskloof","lat":-33.5709,"lon":19.1368,"erica":9.1,"bare":29.5,"soil":0.0,"rock":2.3,"dead":0.0,"rich":7,"shan":1.53,"park":187,"clean":1,"flag":"","note":"","gen":["Thamnochortus","Protea","Erica"]},
      {"id":"T227","reg":"Kogelberg","lat":-34.3232,"lon":18.9648,"erica":22.7,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":7,"shan":1.77,"park":2761,"clean":1,"flag":"","note":"","gen":["Podalyria","Erica","Berzelia"]},
      {"id":"T228","reg":"Franschoekpass","lat":-34.0021,"lon":19.1892,"erica":9.1,"bare":43.2,"soil":0.0,"rock":43.2,"dead":0.0,"rich":11,"shan":2.08,"park":30467,"clean":1,"flag":"","note":"","gen":["Stoebe","Erica","Restio"]},
      {"id":"T229","reg":"Kogelberg","lat":-34.3227,"lon":18.9716,"erica":63.6,"bare":6.8,"soil":0.0,"rock":6.8,"dead":2.3,"rich":7,"shan":1.42,"park":2185,"clean":1,"flag":"","note":"","gen":["Erica","Elegia","Restio"]},
      {"id":"T230","reg":"Cederberg","lat":-32.2115,"lon":19.1046,"erica":0.0,"bare":65.9,"soil":18.2,"rock":47.7,"dead":2.3,"rich":8,"shan":1.91,"park":16684,"clean":0,"flag":"Low vegetation","note":"Plot is on a rock outcrop and not representative of the nearby larger community.","gen":["Willdenowia","Cliffortia","Eriocephalus"]},
      {"id":"T232","reg":"Cederberg","lat":-32.5382,"lon":19.3251,"erica":0.0,"bare":9.1,"soil":9.1,"rock":0.0,"dead":29.5,"rich":6,"shan":1.18,"park":54768,"clean":1,"flag":"","note":"","gen":["Thamnochortus","Willdenowia","Ficinia"]},
      {"id":"T233","reg":"Cederberg","lat":-32.3962,"lon":19.0869,"erica":0.0,"bare":9.1,"soil":2.3,"rock":6.8,"dead":6.8,"rich":7,"shan":1.51,"park":31278,"clean":1,"flag":"","note":"","gen":["Elytropappus","Macrostylis","Restio"]},
      {"id":"T234","reg":"Franschoekpass","lat":-33.9713,"lon":19.2896,"erica":6.8,"bare":4.5,"soil":2.3,"rock":2.3,"dead":0.0,"rich":15,"shan":2.54,"park":30567,"clean":1,"flag":"","note":"","gen":["Restio","Ficinia","Leucadendron"]},
      {"id":"T235","reg":"Hawequas","lat":-33.7344,"lon":19.1212,"erica":9.1,"bare":29.5,"soil":22.7,"rock":6.8,"dead":0.0,"rich":15,"shan":2.49,"park":203,"clean":1,"flag":"","note":"","gen":["Tetraria","Themeda","Erica"]},
      {"id":"T236","reg":"Cederberg","lat":-32.5347,"lon":19.312,"erica":0.0,"bare":29.5,"soil":4.5,"rock":25.0,"dead":6.8,"rich":9,"shan":1.93,"park":54562,"clean":1,"flag":"","note":"","gen":["Diosma","Arctotis","Ficinia"]},
      {"id":"T237","reg":"Grootwinterhoek","lat":-32.9965,"lon":19.0598,"erica":20.5,"bare":6.8,"soil":6.8,"rock":0.0,"dead":0.0,"rich":3,"shan":1.07,"park":147,"clean":0,"flag":"Boundary","note":"Plot is split with half having Erica and half not","gen":["Restio","Elegia","Erica"]},
      {"id":"T238","reg":"Cederberg","lat":-32.4412,"lon":19.1951,"erica":0.0,"bare":6.8,"soil":6.8,"rock":0.0,"dead":2.3,"rich":10,"shan":1.9,"park":40693,"clean":1,"flag":"","note":"","gen":["Cannomois","Syncarpha","Ficinia"]},
      {"id":"T239","reg":"Cederberg","lat":-32.4313,"lon":19.1417,"erica":0.0,"bare":15.9,"soil":4.5,"rock":11.4,"dead":0.0,"rich":11,"shan":2.25,"park":37088,"clean":1,"flag":"","note":"","gen":["Restio","Thamnochortus","Tetraria"]},
      {"id":"T240","reg":"Cederberg","lat":-32.2229,"lon":19.1166,"erica":0.0,"bare":63.6,"soil":9.1,"rock":47.7,"dead":2.3,"rich":8,"shan":1.86,"park":18287,"clean":1,"flag":"","note":"","gen":["Restio","Diosma","Willdenowia"]},
      {"id":"T241","reg":"Cederberg","lat":-32.4362,"lon":19.1795,"erica":0.0,"bare":18.2,"soil":9.1,"rock":9.1,"dead":4.5,"rich":11,"shan":2.04,"park":39406,"clean":1,"flag":"","note":"","gen":["Phylica","Elytropappus","Protea"]},
      {"id":"T242","reg":"Cederberg","lat":-32.153,"lon":19.0313,"erica":0.0,"bare":13.6,"soil":13.6,"rock":0.0,"dead":0.0,"rich":11,"shan":1.79,"park":7928,"clean":1,"flag":"","note":"","gen":["Restio","Stoebe","Willdenowia"]},
      {"id":"T243","reg":"Cederberg","lat":-32.1393,"lon":19.0183,"erica":0.0,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":9,"shan":1.77,"park":6578,"clean":1,"flag":"","note":"","gen":["Helichrysum","Stoebe","Cliffortia"]},
      {"id":"T245","reg":"Rooiberg","lat":-33.7204,"lon":21.6416,"erica":0.0,"bare":36.4,"soil":29.5,"rock":2.3,"dead":6.8,"rich":8,"shan":1.93,"park":122,"clean":1,"flag":"","note":"","gen":["Ruschia","Indigofera","Euphorbia"]},
      {"id":"T253","reg":"Vrolijkheid","lat":-33.9541,"lon":19.8936,"erica":0.0,"bare":40.9,"soil":0.0,"rock":0.0,"dead":0.0,"rich":10,"shan":2.0,"park":118,"clean":1,"flag":"","note":"","gen":["Ruschia","Pteronia","Crassula"]},
      {"id":"T254","reg":"Grootwinterhoek","lat":-32.973,"lon":19.0525,"erica":29.5,"bare":2.3,"soil":2.3,"rock":0.0,"dead":6.8,"rich":5,"shan":1.27,"park":312,"clean":1,"flag":"","note":"","gen":["Tenaxia","Erica","Stoebe"]},
      {"id":"T261","reg":"Outeniqua","lat":-33.8905,"lon":22.0224,"erica":15.9,"bare":31.8,"soil":9.1,"rock":22.7,"dead":0.0,"rich":8,"shan":1.78,"park":207,"clean":0,"flag":"Low vegetation","note":"Rocky at plot","gen":["Metalasia","Erica","Penaea"]},
      {"id":"T264","reg":"Vrolijkheid","lat":-33.9419,"lon":19.8898,"erica":0.0,"bare":40.9,"soil":0.0,"rock":0.0,"dead":0.0,"rich":7,"shan":1.49,"park":87,"clean":1,"flag":"","note":"","gen":["Pteronia","Hirpicium","Ruschia"]},
      {"id":"T265","reg":"Cape Point","lat":-34.1436,"lon":18.4049,"erica":0.0,"bare":0.0,"soil":0.0,"rock":0.0,"dead":15.9,"rich":4,"shan":0.81,"park":3412,"clean":1,"flag":"","note":"","gen":["Leucadendron","Searsia","Helichrysum"]},
      {"id":"T266","reg":"Cape Point","lat":-34.321,"lon":18.4562,"erica":13.6,"bare":13.6,"soil":11.4,"rock":2.3,"dead":27.3,"rich":11,"shan":2.2,"park":220,"clean":0,"flag":"Low vegetation","note":"Plot located right off of walking trail and in open area. 25-40% gray non-photosynthetic vegetation","gen":["Searsia","Erica","Passerina"]},
      {"id":"T270","reg":"West Coast","lat":-32.6157,"lon":18.2965,"erica":0.0,"bare":27.3,"soil":27.3,"rock":0.0,"dead":11.4,"rich":6,"shan":1.59,"park":58878,"clean":1,"flag":"","note":"","gen":["Eriocephalus","Othonna","Willdenowia"]},
      {"id":"T273","reg":"De Hoop","lat":-34.4336,"lon":20.4194,"erica":27.3,"bare":15.9,"soil":4.5,"rock":0.0,"dead":2.3,"rich":11,"shan":2.04,"park":63,"clean":1,"flag":"","note":"","gen":["Erica","Euchaetis","Protea"]},
      {"id":"T274","reg":"De Hoop","lat":-34.4729,"lon":20.4584,"erica":22.7,"bare":15.9,"soil":15.9,"rock":0.0,"dead":2.3,"rich":3,"shan":0.79,"park":57,"clean":1,"flag":"","note":"","gen":["Thamnochortus","Erica","Restio"]},
      {"id":"T277","reg":"West Coast","lat":-33.1492,"lon":18.029,"erica":0.0,"bare":11.4,"soil":11.4,"rock":0.0,"dead":9.1,"rich":11,"shan":2.18,"park":182,"clean":1,"flag":"","note":"","gen":["Calobota","Putterlickia","Roepera"]},
      {"id":"T278","reg":"Gardenroute","lat":-33.9946,"lon":22.7216,"erica":0.0,"bare":11.4,"soil":11.4,"rock":0.0,"dead":9.1,"rich":12,"shan":2.36,"park":257,"clean":0,"flag":"Boundary","note":"On edge","gen":["Helichrysum","Phylica","Tetraria"]},
      {"id":"T279","reg":"Cederberg","lat":-32.5271,"lon":19.3483,"erica":0.0,"bare":20.5,"soil":6.8,"rock":13.6,"dead":22.7,"rich":8,"shan":1.75,"park":56880,"clean":1,"flag":"","note":"","gen":["Thamnochortus","Eriocephalus","Pentameris"]},
      {"id":"T280","reg":"Cederberg","lat":-32.4348,"lon":19.1964,"erica":0.0,"bare":43.2,"soil":43.2,"rock":0.0,"dead":4.5,"rich":11,"shan":2.18,"park":40184,"clean":1,"flag":"","note":"","gen":["Ficinia","Ehrharta","Restio"]},
      {"id":"T281","reg":"West Coast","lat":-33.162,"lon":18.0457,"erica":0.0,"bare":11.4,"soil":4.5,"rock":0.0,"dead":2.3,"rich":15,"shan":2.34,"park":236,"clean":1,"flag":"","note":"","gen":["Euclea","Maytenus","Othonna"]},
      {"id":"T282","reg":"West Coast","lat":-33.1131,"lon":18.0906,"erica":0.0,"bare":36.4,"soil":36.4,"rock":0.0,"dead":2.3,"rich":6,"shan":1.39,"park":479,"clean":0,"flag":"Other","note":"Plot  may be dominated by an indigenous invasive on an old gum plantation","gen":["Thamnochortus","Osteospermum","Searsia"]},
      {"id":"T284","reg":"De Hoop","lat":-34.4747,"lon":20.4859,"erica":0.0,"bare":13.6,"soil":13.6,"rock":0.0,"dead":2.3,"rich":10,"shan":2.09,"park":125,"clean":1,"flag":"","note":"","gen":["Passerina","Eriocephalus","Otholobium"]},
      {"id":"T287","reg":"Houwhoekpass","lat":-34.2246,"lon":19.1733,"erica":6.8,"bare":0.0,"soil":0.0,"rock":0.0,"dead":0.0,"rich":14,"shan":2.01,"park":20267,"clean":0,"flag":"Removed invasive","note":"Chopped pine 1 x 1 m (in pixel) near center","gen":["Leucadendron","Restio","Erica"]},
      {"id":"T288","reg":"Kogelberg","lat":-34.3266,"lon":18.9658,"erica":50.0,"bare":4.5,"soil":4.5,"rock":0.0,"dead":0.0,"rich":14,"shan":2.15,"park":2581,"clean":1,"flag":"","note":"","gen":["Erica","Restio","Tetraria"]},
      {"id":"T289","reg":"Cederberg","lat":-32.1368,"lon":18.9851,"erica":0.0,"bare":38.6,"soil":36.4,"rock":0.0,"dead":0.0,"rich":9,"shan":1.84,"park":3477,"clean":1,"flag":"","note":"","gen":["Restio","Cannomois","Thesium"]},
      {"id":"T290","reg":"Cederberg","lat":-32.1977,"lon":19.0944,"erica":0.0,"bare":43.2,"soil":43.2,"rock":0.0,"dead":2.3,"rich":5,"shan":1.38,"park":15139,"clean":0,"flag":"Low vegetation","note":"Looks recently burnt, potentially since original survey","gen":["Elytropappus","Restio","Cliffortia"]}
    ];

    // =========================================================================
    // 2. APPLICATION STATE
    // =========================================================================
    const state = {
      region: 'ALL',
      hygiene: 'all',      // 'all' | 'clean' | 'flagged'
      maxBare: 80,
      parking: 'all',      // 'all' | 'near' | 'moderate' | 'remote'
      plotSearch: '',
      selectedPlotId: null
    };

    // Map & Chart instances
    let map;
    let markersLayer;
    const markerLookup = {};
    let tippingChart;
    let scatterChart;
    let regionChart;

    // =========================================================================
    // 3. STATISTICAL & COLOR UTILITIES
    // =========================================================================
    function getEricaColor(erica) {
      if (erica <= 0) return '#64748b'; // Neutral slate gray when absent
      // Smooth emerald (#10b981) -> navy (#1e3a8a) interpolation
      const t = Math.min(Math.max(erica / 65, 0), 1);
      const r = Math.round(16 + (30 - 16) * t);
      const g = Math.round(185 + (58 - 185) * t);
      const b = Math.round(129 + (138 - 129) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }

    function computeMedian(arr) {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    function computePearson(xs, ys) {
      const n = xs.length;
      if (n < 3) return null;
      const meanX = xs.reduce((a, b) => a + b, 0) / n;
      const meanY = ys.reduce((a, b) => a + b, 0) / n;
      let num = 0, denX = 0, denY = 0;
      for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      const den = Math.sqrt(denX * denY);
      if (den === 0) return null;
      return num / den;
    }

    function showToast(msg) {
      const banner = document.getElementById('toastBanner');
      const text = document.getElementById('toastMessage');
      text.textContent = msg;
      banner.classList.remove('hidden');
      banner.classList.add('flex');
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => {
        banner.classList.add('hidden');
        banner.classList.remove('flex');
      }, 3200);
    }

    // =========================================================================
    // 4. INITIALIZE CONTROLS & POPULATE DROPDOWNS
    // =========================================================================
    function initControls() {
      const regionSelect = document.getElementById('regionFilter');
      const regionCounts = {};
      PLOTS_DATA.forEach(p => {
        regionCounts[p.reg] = (regionCounts[p.reg] || 0) + 1;
      });
      const uniqueRegions = Object.keys(regionCounts).sort((a, b) => a.localeCompare(b));

      regionSelect.innerHTML = `<option value="ALL">All Regions (${uniqueRegions.length})</option>` +
        uniqueRegions.map(r => `<option value="${r}">${r} (${regionCounts[r]})</option>`).join('');

      // Region change
      regionSelect.addEventListener('change', (e) => {
        state.region = e.target.value;
        updateDashboard();
      });

      // Hygiene segmented buttons
      document.querySelectorAll('.hygiene-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.hygiene = btn.dataset.hygiene;
          document.querySelectorAll('.hygiene-btn').forEach(b => {
            b.className = 'hygiene-btn px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer';
          });
          btn.className = 'hygiene-btn px-2 py-1.5 rounded-lg text-xs font-semibold bg-[#0f172a] text-white shadow-xs transition cursor-pointer';
          updateDashboard();
        });
      });

      // Bare ground slider
      const bareSlider = document.getElementById('bareSlider');
      const bareReadout = document.getElementById('bareReadout');
      const tippingBtn = document.getElementById('tippingPointBtn');

      bareSlider.addEventListener('input', (e) => {
        state.maxBare = Number(e.target.value);
        bareReadout.innerHTML = `&le; ${state.maxBare}%`;
        updateTippingButtonStyle();
        updateDashboard();
      });

      // 25% Tipping point quick preset button
      tippingBtn.addEventListener('click', () => {
        if (state.maxBare === 25) {
          state.maxBare = 80;
          showToast('Reset bare ground threshold to ≤ 80%');
        } else {
          state.maxBare = 25;
          showToast('Applied 25% Bare Ground Tipping Point (≤ 25%)');
        }
        bareSlider.value = state.maxBare;
        bareReadout.innerHTML = `&le; ${state.maxBare}%`;
        updateTippingButtonStyle();
        updateDashboard();
      });

      function updateTippingButtonStyle() {
        if (state.maxBare === 25) {
          tippingBtn.className = 'shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#d97706] text-white border border-amber-700 shadow-xs transition cursor-pointer';
        } else {
          tippingBtn.className = 'shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition cursor-pointer';
        }
      }

      // Parking proximity filter
      document.getElementById('parkingFilter').addEventListener('change', (e) => {
        state.parking = e.target.value;
        updateDashboard();
      });

      // Plot ID search
      const plotSearchInput = document.getElementById('plotSearch');
      const clearSearchBtn = document.getElementById('clearSearchBtn');

      plotSearchInput.addEventListener('input', (e) => {
        state.plotSearch = e.target.value.trim();
        clearSearchBtn.classList.toggle('hidden', state.plotSearch.length === 0);
        updateDashboard(true);
      });

      clearSearchBtn.addEventListener('click', () => {
        state.plotSearch = '';
        plotSearchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        updateDashboard();
      });

      // Reset all filters
      document.getElementById('resetAllBtn').addEventListener('click', () => {
        state.region = 'ALL';
        state.hygiene = 'all';
        state.maxBare = 80;
        state.parking = 'all';
        state.plotSearch = '';
        state.selectedPlotId = null;

        regionSelect.value = 'ALL';
        document.getElementById('parkingFilter').value = 'all';
        bareSlider.value = 80;
        bareReadout.innerHTML = '&le; 80%';
        updateTippingButtonStyle();
        plotSearchInput.value = '';
        clearSearchBtn.classList.add('hidden');

        document.querySelectorAll('.hygiene-btn').forEach(b => {
          b.className = b.dataset.hygiene === 'all'
            ? 'hygiene-btn px-2 py-1.5 rounded-lg text-xs font-semibold bg-[#0f172a] text-white shadow-xs transition cursor-pointer'
            : 'hygiene-btn px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer';
        });

        map.setView([-33.6, 20.5], 7);
        updateDashboard();
        showToast('All filters and map view reset');
      });

      // Reset map zoom button
      document.getElementById('resetMapZoomBtn').addEventListener('click', () => {
        map.setView([-33.6, 20.5], 7);
      });

      // Export Filtered CSV
      document.getElementById('exportCsvBtn').addEventListener('click', exportFilteredCSV);
    }

    // =========================================================================
    // 5. FILTERING LOGIC
    // =========================================================================
    function getFilteredPlots() {
      return PLOTS_DATA.filter(p => {
        if (state.region !== 'ALL' && p.reg !== state.region) return false;
        if (state.hygiene === 'clean' && p.clean !== 1) return false;
        if (state.hygiene === 'flagged' && p.clean !== 0) return false;
        if (p.bare > state.maxBare) return false;

        if (state.parking === 'near' && p.park >= 150) return false;
        if (state.parking === 'moderate' && (p.park < 150 || p.park > 500)) return false;
        if (state.parking === 'remote' && p.park <= 500) return false;

        if (state.plotSearch) {
          const q = state.plotSearch.toLowerCase();
          if (!p.id.toLowerCase().includes(q)) return false;
        }
        return true;
      });
    }

    // =========================================================================
    // 6. LEAFLET MAP SETUP & DYNAMIC UPDATE
    // =========================================================================
    function initMap() {
      map = L.map('bioscapeMap', {
        center: [-33.6, 20.5],
        zoom: 7,
        zoomControl: true
      });

      const cartoPositron = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 19
        }
      );

      const esriSatellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
          maxZoom: 18
        }
      );

      cartoPositron.addTo(map);

      L.control.layers(
        {
          'CartoDB Positron (Light)': cartoPositron,
          'Esri World Imagery (Satellite)': esriSatellite
        },
        null,
        { position: 'topright' }
      ).addTo(map);

      markersLayer = L.layerGroup().addTo(map);
    }

    function buildPopupHTML(p) {
      const statusBadge = p.clean === 1
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">Clean Plot</span>`
        : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">Flag: ${p.flag || 'Anomalous'}</span>`;

      const generaBadges = p.gen.map(g =>
        `<span class="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 italic">${g}</span>`
      ).join(' ');

      const noteHTML = p.note
        ? `<div class="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-snug">
             <strong class="font-semibold">Field Note:</strong> ${p.note}
           </div>`
        : '';

      return `
        <div class="text-slate-800">
          <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div>
              <span class="text-sm font-extrabold text-slate-900">${p.id}</span>
              <span class="text-xs font-medium text-slate-500 ml-1.5">&bull; ${p.reg}</span>
            </div>
            ${statusBadge}
          </div>

          <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-500">Erica Cover:</span>
              <span class="font-bold text-emerald-700">${p.erica.toFixed(1)}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Total Bare:</span>
              <span class="font-bold text-amber-700">${p.bare.toFixed(1)}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Bare Soil:</span>
              <span class="font-semibold text-slate-700">${p.soil.toFixed(1)}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Bare Rock:</span>
              <span class="font-semibold text-slate-700">${p.rock.toFixed(1)}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Dead Plant:</span>
              <span class="font-semibold text-slate-700">${p.dead.toFixed(1)}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Richness / H':</span>
              <span class="font-semibold text-blue-700">${p.rich} spp / ${p.shan.toFixed(2)}</span>
            </div>
            <div class="col-span-2 flex justify-between pt-1 border-t border-slate-100">
              <span class="text-slate-500">Parking Distance:</span>
              <span class="font-semibold text-slate-800">${p.park.toLocaleString()} m</span>
            </div>
          </div>

          <div class="mt-2.5">
            <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Dominant Genera</div>
            <div class="flex flex-wrap gap-1">${generaBadges}</div>
          </div>

          ${noteHTML}
        </div>
      `;
    }

    function updateMap(plots, fromSearch = false) {
      markersLayer.clearLayers();
      Object.keys(markerLookup).forEach(k => delete markerLookup[k]);

      plots.forEach(p => {
        const isZero = p.erica <= 0;
        const radius = isZero ? 6 : Math.min(6 + p.erica * 0.22, 22);
        const fillColor = getEricaColor(p.erica);
        const isSelected = state.selectedPlotId === p.id;

        const marker = L.circleMarker([p.lat, p.lon], {
          radius: isSelected ? radius + 3 : radius,
          fillColor: fillColor,
          color: isSelected ? '#f59e0b' : '#ffffff',
          weight: isSelected ? 3 : 1.5,
          opacity: 1,
          fillOpacity: isZero ? 0.78 : 0.88
        });

        marker.bindPopup(buildPopupHTML(p), { maxWidth: 320 });

        marker.on('click', () => {
          selectPlot(p.id);
        });

        marker.addTo(markersLayer);
        markerLookup[p.id] = marker;
      });

      // If Plot ID search narrows down to 1 exact/single match, zoom and open popup
      if (fromSearch && plots.length === 1) {
        const target = plots[0];
        map.setView([target.lat, target.lon], 12, { animate: true });
        if (markerLookup[target.id]) {
          markerLookup[target.id].openPopup();
        }
        selectPlot(target.id);
      }
    }

    function focusPlotOnMap(plotId) {
      const plot = PLOTS_DATA.find(p => p.id === plotId);
      if (!plot) return;

      state.selectedPlotId = plotId;
      document.getElementById('bioscapeMap').scrollIntoView({ behavior: 'smooth', block: 'center' });
      map.setView([plot.lat, plot.lon], 13, { animate: true });

      const marker = markerLookup[plotId];
      if (marker) {
        marker.openPopup();
      }
      selectPlot(plotId);
    }

    function selectPlot(plotId) {
      state.selectedPlotId = plotId;
    }

    // =========================================================================
    // 7. KPI CARDS UPDATE
    // =========================================================================
    function updateKPIs(plots) {
      const n = plots.length;
      const totalN = PLOTS_DATA.length;
      const pctOfTotal = ((n / totalN) * 100).toFixed(1);

      document.getElementById('kpiCount').textContent = n;
      document.getElementById('kpiCountPct').textContent = `${pctOfTotal}% of total ${totalN}`;

      if (n === 0) {
        document.getElementById('kpiEricaPresence').innerHTML = 'No plots match active filters';
        document.getElementById('kpiEricaMean').textContent = '0.0%';
        document.getElementById('kpiEricaMedian').textContent = 'Median: 0.0%';
        document.getElementById('kpiEricaMax').textContent = 'Peak plot cover: —';
        document.getElementById('kpiBareMean').textContent = '0.0%';
        document.getElementById('kpiSoilMean').textContent = 'Soil: 0.0%';
        document.getElementById('kpiRockMean').textContent = 'Rock: 0.0%';
        document.getElementById('kpiRichness').textContent = '0.0';
        document.getElementById('kpiPearson').textContent = 'r = N/A';
        return;
      }

      const ericaArr = plots.map(p => p.erica);
      const bareArr = plots.map(p => p.bare);
      const soilArr = plots.map(p => p.soil);
      const rockArr = plots.map(p => p.rock);
      const richArr = plots.map(p => p.rich);

      const ericaPresentCount = plots.filter(p => p.erica > 0).length;
      const ericaPresentPct = ((ericaPresentCount / n) * 100).toFixed(1);
      document.getElementById('kpiEricaPresence').innerHTML =
        `Erica detected in <strong class="text-slate-700">${ericaPresentCount}</strong> plots (${ericaPresentPct}%)`;

      const meanErica = ericaArr.reduce((a, b) => a + b, 0) / n;
      const medErica = computeMedian(ericaArr);
      const peakPlot = plots.reduce((best, cur) => (cur.erica > best.erica ? cur : best), plots[0]);

      document.getElementById('kpiEricaMean').textContent = `${meanErica.toFixed(1)}%`;
      document.getElementById('kpiEricaMedian').textContent = `Median: ${medErica.toFixed(1)}%`;
      document.getElementById('kpiEricaMax').innerHTML =
        `Peak plot cover: <strong class="text-slate-700">${peakPlot.erica.toFixed(1)}%</strong> (${peakPlot.id})`;

      const meanBare = bareArr.reduce((a, b) => a + b, 0) / n;
      const meanSoil = soilArr.reduce((a, b) => a + b, 0) / n;
      const meanRock = rockArr.reduce((a, b) => a + b, 0) / n;

      document.getElementById('kpiBareMean').textContent = `${meanBare.toFixed(1)}%`;
      document.getElementById('kpiSoilMean').textContent = `Soil: ${meanSoil.toFixed(1)}%`;
      document.getElementById('kpiRockMean').textContent = `Rock: ${meanRock.toFixed(1)}%`;

      const meanRich = richArr.reduce((a, b) => a + b, 0) / n;
      document.getElementById('kpiRichness').textContent = meanRich.toFixed(1);

      const r = computePearson(bareArr, ericaArr);
      const pearsonEl = document.getElementById('kpiPearson');
      if (r === null) {
        pearsonEl.textContent = 'r = N/A';
        pearsonEl.className = 'font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md';
      } else {
        pearsonEl.textContent = `r = ${r >= 0 ? '+' : ''}${r.toFixed(3)}`;
        pearsonEl.className = r < -0.15
          ? 'font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md'
          : 'font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md';
      }
    }

    // =========================================================================
    // 8. CHART.JS VISUALIZATIONS (PANELS B, C, D)
    // =========================================================================
    function initCharts() {
      Chart.defaults.font.family = "'Inter', sans-serif";
      Chart.defaults.color = '#475569';

      // Custom vertical reference line plugin for Scatter Plot (X = 25%)
      const tippingVerticalLinePlugin = {
        id: 'tippingVerticalLine',
        afterDraw(chart) {
          if (chart.canvas.id !== 'scatterChart') return;
          const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
          const xPos = x.getPixelForValue(25);
          if (xPos < x.left || xPos > x.right) return;

          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([6, 4]);
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = '#dc2626';
          ctx.moveTo(xPos, top);
          ctx.lineTo(xPos, bottom);
          ctx.stroke();

          ctx.fillStyle = '#dc2626';
          ctx.font = '600 11px Inter, sans-serif';
          ctx.fillText('25% Tipping Point', xPos + 6, top + 14);
          ctx.restore();
        }
      };
      Chart.register(tippingVerticalLinePlugin);

      // Panel B: Tipping Point Grouped Bar + Line Chart
      const ctxB = document.getElementById('tippingChart').getContext('2d');
      tippingChart = new Chart(ctxB, {
        data: {
          labels: ['0–10% Dense', '10–25% Moderate', '25–40% Open', '>40% Sparse/Rocky'],
          datasets: [
            {
              type: 'bar',
              label: 'Mean Erica Cover (%)',
              data: [0, 0, 0, 0],
              backgroundColor: ['#059669', '#10b981', '#f59e0b', '#ef4444'],
              borderRadius: 8,
              barPercentage: 0.55,
              yAxisID: 'y'
            },
            {
              type: 'line',
              label: 'Mean Species Richness',
              data: [0, 0, 0, 0],
              borderColor: '#0f172a',
              backgroundColor: '#d97706',
              borderWidth: 2.5,
              pointRadius: 6,
              pointHoverRadius: 8,
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              tension: 0.25,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { weight: '600' } } },
            tooltip: {
              backgroundColor: '#0f172a',
              padding: 12,
              cornerRadius: 10
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { weight: '600', size: 11 } }
            },
            y: {
              type: 'linear',
              position: 'left',
              beginAtZero: true,
              title: { display: true, text: 'Mean Erica Cover (%)', color: '#059669', font: { weight: '700' } },
              grid: { color: '#e2e8f0' }
            },
            y1: {
              type: 'linear',
              position: 'right',
              beginAtZero: true,
              suggestedMax: 12,
              title: { display: true, text: 'Mean Species Richness (spp.)', color: '#d97706', font: { weight: '700' } },
              grid: { drawOnChartArea: false }
            }
          }
        }
      });

      // Panel C: Scatter Plot (Bare Ground % vs Erica Cover %)
      const ctxC = document.getElementById('scatterChart').getContext('2d');
      scatterChart = new Chart(ctxC, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Clean Unflagged Plots',
              data: [],
              backgroundColor: 'rgba(5, 150, 105, 0.78)',
              borderColor: '#065f46',
              borderWidth: 1,
              pointRadius: 5.5,
              pointHoverRadius: 8
            },
            {
              label: 'Flagged / Anomalous Plots',
              data: [],
              backgroundColor: 'rgba(217, 119, 6, 0.82)',
              borderColor: '#92400e',
              borderWidth: 1,
              pointRadius: 6,
              pointHoverRadius: 8.5,
              pointStyle: 'triangle'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (_, elements) => {
            if (!elements.length) return;
            const el = elements[0];
            const pt = scatterChart.data.datasets[el.datasetIndex].data[el.index];
            if (pt && pt.plot) {
              focusPlotOnMap(pt.plot.id);
              showToast(`Centered map on ${pt.plot.id} (${pt.plot.reg})`);
            }
          },
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, font: { weight: '600' } } },
            tooltip: {
              backgroundColor: '#0f172a',
              padding: 12,
              cornerRadius: 10,
              callbacks: {
                label(ctx) {
                  const p = ctx.raw.plot;
                  return [
                    `Plot ${p.id} (${p.reg})`,
                    `Erica Cover: ${p.erica.toFixed(1)}% | Bare Ground: ${p.bare.toFixed(1)}%`,
                    `Species Richness: ${p.rich} spp. | Status: ${p.clean ? 'Clean' : p.flag}`
                  ];
                }
              }
            }
          },
          scales: {
            x: {
              min: 0,
              max: 80,
              title: { display: true, text: 'Total Bare Ground (%)', font: { weight: '700' } },
              grid: { color: '#e2e8f0' }
            },
            y: {
              min: 0,
              suggestedMax: 75,
              title: { display: true, text: 'Erica Cover (%)', font: { weight: '700' } },
              grid: { color: '#e2e8f0' }
            }
          }
        }
      });

      // Panel D: Regional Horizontal Bar Chart
      const ctxD = document.getElementById('regionChart').getContext('2d');
      regionChart = new Chart(ctxD, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Mean Erica Cover (%)',
              data: [],
              backgroundColor: '#059669',
              borderRadius: 4
            },
            {
              label: 'Mean Bare Soil (%)',
              data: [],
              backgroundColor: '#d97706',
              borderRadius: 4
            },
            {
              label: 'Mean Bare Rock (%)',
              data: [],
              backgroundColor: '#2563eb',
              borderRadius: 4
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { weight: '600' } } },
            tooltip: {
              backgroundColor: '#0f172a',
              padding: 12,
              cornerRadius: 10
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              title: { display: true, text: 'Mean Cover (%)', font: { weight: '700' } },
              grid: { color: '#e2e8f0' }
            },
            y: {
              grid: { display: false },
              ticks: { font: { weight: '600', size: 11 } }
            }
          }
        }
      });
    }

    function updateCharts(plots) {
      // --- Update Panel B: 4 Bare Ground Bins ---
      const bins = [
        { label: '0–10% Dense', items: plots.filter(p => p.bare <= 10) },
        { label: '10–25% Moderate', items: plots.filter(p => p.bare > 10 && p.bare <= 25) },
        { label: '25–40% Open', items: plots.filter(p => p.bare > 25 && p.bare <= 40) },
        { label: '>40% Sparse/Rocky', items: plots.filter(p => p.bare > 40) }
      ];

      tippingChart.data.labels = bins.map(b => `${b.label} (n=${b.items.length})`);
      tippingChart.data.datasets[0].data = bins.map(b =>
        b.items.length ? Number((b.items.reduce((s, p) => s + p.erica, 0) / b.items.length).toFixed(2)) : 0
      );
      tippingChart.data.datasets[1].data = bins.map(b =>
        b.items.length ? Number((b.items.reduce((s, p) => s + p.rich, 0) / b.items.length).toFixed(2)) : 0
      );
      tippingChart.update();

      // --- Update Panel C: Scatter Plot ---
      const cleanPoints = [];
      const flaggedPoints = [];
      plots.forEach(p => {
        const pt = { x: p.bare, y: p.erica, plot: p };
        if (p.clean === 1) cleanPoints.push(pt);
        else flaggedPoints.push(pt);
      });
      scatterChart.data.datasets[0].data = cleanPoints;
      scatterChart.data.datasets[1].data = flaggedPoints;
      scatterChart.update();

      // --- Update Panel D: Top Regions Profile ---
      const regMap = {};
      plots.forEach(p => {
        if (!regMap[p.reg]) {
          regMap[p.reg] = { reg: p.reg, count: 0, erica: 0, soil: 0, rock: 0 };
        }
        regMap[p.reg].count += 1;
        regMap[p.reg].erica += p.erica;
        regMap[p.reg].soil += p.soil;
        regMap[p.reg].rock += p.rock;
      });

      const regSummary = Object.values(regMap)
        .map(r => ({
          label: `${r.reg} (n=${r.count})`,
          erica: Number((r.erica / r.count).toFixed(1)),
          soil: Number((r.soil / r.count).toFixed(1)),
          rock: Number((r.rock / r.count).toFixed(1)),
          count: r.count
        }))
        .sort((a, b) => (b.erica - a.erica) || (b.count - a.count))
        .slice(0, 10);

      regionChart.data.labels = regSummary.map(r => r.label);
      regionChart.data.datasets[0].data = regSummary.map(r => r.erica);
      regionChart.data.datasets[1].data = regSummary.map(r => r.soil);
      regionChart.data.datasets[2].data = regSummary.map(r => r.rock);
      regionChart.update();
    }

    // =========================================================================
    // 10. CSV EXPORT UTILITY
    // =========================================================================
    function exportFilteredCSV() {
      const plots = getFilteredPlots();
      if (!plots.length) {
        showToast('No plots available to export under current filters.');
        return;
      }

      const headers = [
        'plot_id', 'region', 'latitude', 'longitude',
        'erica_pct', 'bare_total_pct', 'bare_soil_pct', 'bare_rock_pct', 'dead_plant_pct',
        'species_richness', 'shannon_diversity', 'parking_distance_m',
        'is_clean', 'quality_flag', 'top_genera', 'field_note'
      ];

      const escapeCSV = (val) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvLines = [
        headers.join(','),
        ...plots.map(p => [
          p.id, p.reg, p.lat, p.lon,
          p.erica, p.bare, p.soil, p.rock, p.dead,
          p.rich, p.shan, p.park,
          p.clean, p.flag, p.gen.join('; '), p.note
        ].map(escapeCSV).join(','))
      ];

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bioscape_filtered_plots_n${plots.length}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${plots.length} filtered plots to CSV`);
    }

    // =========================================================================
    // 11. MASTER ORCHESTRATOR & BOOTSTRAP
    // =========================================================================
    function updateDashboard(fromSearch = false) {
      const filtered = getFilteredPlots();
      updateKPIs(filtered);
      updateMap(filtered, fromSearch);
      updateCharts(filtered);
    }

    window.addEventListener('DOMContentLoaded', () => {
      initControls();
      initMap();
      initCharts();
      updateDashboard();
    });
  