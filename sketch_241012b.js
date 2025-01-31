// speremenljivka, ki bo hranila naš canvas
let canvas;

// spremenljivke, ki bodo hranile besedilo na strani
let textType, textZoom, textSpecila, textNavodila;
let typeCount = 0; // koliko znakov je uporabnik napisla
let zoomActive = 0; // ali je povečevanje aktivirano

// gumb, ki doloca ali bomo prikazali posebne poste
let switchButton;
let switchActive = false;

// Parametri za LCC (Lambert Conformal Conic) projekcijo (spodnje vrednosti so specifične za Slovenijo)
let phi1 = 45.5; //radians(46); - Standardni vzporednik 1 (približno 46°N)
let phi2 = 46.5; //radians(47); - Standardni vzporednik 2 (približno 47°N)
let lambda0 = 14.5; //radians(14.5); - Centralni poldnevnik (približno 14.5°E)
let phi0 = 46; //radians(46); - Referenčna zemljepisna širina (približno 46°N) - približno na sredini Slovenije

// n določa, kako hitro se razdalje spreminjajo glede na širino in kako se dolžine deformirajo na različnih širinah.
// F se uporablja se izračunu projekcijske razdalje (ρ) na stožčnem zemljevidu. Pomaga določiti velikost deformacije na različnih širinah.
// rho0 je oddaljenost centralne širine od projekcijskega središča.
let n, F, rho0;

// spremenljivka v katero bomo prebrali vse navadne pošte
let poste;
// spremenljivka v katero bomo prebrali vse posebne pošte
let posebnePoste;
// wspremenljivka v kateri bomo hranili vse pošte (navadne in posebne) in jo bomo uporabljali za obdelavo
let table;

// spremenljivke določajo minimalne in maksimalne zemljepisne višine in širine (po izvajanju LCC projekcije)
let maxX = -1; // maksimalna latituda po projeciranju
let minX = 1; // minimalna latituda po projeciranju
let maxY = -1; // maksimalna longituda po projeciranju
let minY = 1; // minimalna longituda po projeciranju

// spremenljivke, ki določajo na kateri min/max x/y se hočemo premakniti pri povečevanju zemljevida
// uporabljajo se da so prehodi postopni
let targetMaxX = 0;
let targetMinX = 0;
let targetMaxY = 0;
let targetMinY = 0;

// v te spremenljivke shranimo min/max x in y vrednosti začetnega zemljevida
let originalMaxX = -1; // maksimalna latituda pred projeciranjem
let originalMinX = 1; // minimalna latituda pred projeciranjem
let originalMaxY = -1; // maksimalna longituda pred projeciranjem
let originalMinY = 1; // minimalna longituda pred projeciranjem
// Meje v katarih naj se zemljevid mapira (na zaslonske koordinate)
let mapX1, mapY1, mapX2, mapY3;

// določajo nove min in max vrednosti x in y koordinat ob premikanju
let newMinX = 1;
let newMaxX = -1;
let newMinY = 1;
let newMaxY = -1;

// ali smo najdli kakšno pošto ob pisanju poštne številke (hrani koliko je najdenih pošt)
let anyMatches = 0;
// spremanljivka določa ali imamo najdeno pošto, ko so vpisane vse 4 cifre poštne številke
let match = -1;

// določimo barve za različne scenarije
const backgroundColor = "#212120"; // ozadje
const pointsColor = "#FFD541"; // točke na začetku (pred vpisom katerekoli cifre)
const highlightedColorText = "#f7e8b2"; // aktivno besedilo
const highlightedColor = "#ffffff"; // najdene točke
const unhighlightedColor = "#4a4737"; // točke, ki ne ustrezajo najdenemu nizu in neaktivno besedilo
const badSearchColor = "#e6b502"; // besedilo pošte številke, če ni najdena nobena pošta
const popupColor = "#fcf7e3"; // barva pojavnega okna
const grayedOutColor = "#363530"; // osivene navadne pošte, ko so aktivne posebne pošte

// pojavno okno, ki se prikaže ime pošte
let popup;

// spremenljivka, ki določa ali pobrišemo narisane točke
let clearLayer = false;

// spremenljivka, ki določa x in y koordinate izbrane pošte
let chosenX, chosenY;

// ali je priprava podatkov končana
let dataReady = false;

// metoda, ki se izve4de na začetku in prebere navadne in posebne pošte iz .csv datotek
function preload() {
	// preberemo podatke o poštah iz datoteke regular_post_offices_with_latlong.csv [postalCode, place, latitude, longitude]
	poste = loadTable(
		"data/regular_post_offices_with_latlong.csv",
		"csv",
		"header"
	);
	// preberemo podatke o posebnih poštah iz datoteke special_post_offices_with_latlong.csv [postalCode, place, latitude, longitude]
	posebnePoste = loadTable(
		"data/special_post_offices_with_latlong.csv",
		"csv",
		"header"
	);
}

let aspectRatio = 920 / 653;

function setup() {
	// nastaivimo velikost canvasa in ga ustvarimo
	let canvasWidth = (3 * 920) / 4;
	let canvasHeight = (3 * 653) / 4;
	canvas = createCanvas(canvasWidth, canvasHeight);

	resizeCanvasToAspect();

	// ustvarimo 2 plasti na canvasu, ki jih bomo uporabili za risanje
	layer1 = createGraphics(width, height);
	layer2 = createGraphics(width, height);

	// centriramo canvas
	centerCanvas();

	// ustvarimo besedilo na strani
	createText();

	// določimo meje zemljevida
	mapX1 = 60;
	mapX2 = width - mapX1;
	mapY1 = 60;
	mapY2 = height - mapY1;

	// parametre za LCC pretvorimo v radiane
	phi1 = radians(phi1);
	phi2 = radians(phi2);
	lambda0 = radians(lambda0);
	phi0 = radians(phi0);

	// izračunamo konstante n, F in rho0
	n =
		(log(cos(phi1)) - log(cos(phi2))) /
		(log(tan(PI / 4 + phi2 / 2)) - log(tan(PI / 4 + phi1 / 2)));
	F = (cos(phi1) * pow(tan(PI / 4 + phi1 / 2), n)) / n;
	rho0 = F / pow(tan(PI / 4 + phi0 / 2), n);

	// izvedemo pred procesiranje podatkov na poštah in posebnih poštah
	poste = setUpPreprocessing(poste);
	posebnePoste = setUpPreprocessing(posebnePoste);
	// zgornji tabeli združimo v eno, ki jo bomo naprej uporabljali
	table = joinTables(poste, posebnePoste);

	// predprocesiranje podatkov
	preprocessing();
	// označimo, da so podatki pripravljeni za uporabo
	dataReady = true;

	// inicializiramo pojavnostno okno za prikaz imena pošte
	createPopUp();
}

// Združimo posebne in navadne pošte v eno tabelo
function joinTables(tableA, tableB) {
	// vstvarimo novo tabelo
	let newTable = new p5.Table();

	// Dodamo stolpce v novo tabelo
	for (let c = 0; c < tableA.columns.length; c++) {
		newTable.addColumn(tableA.columns[c]);
	}

	// Dodamo vrstice navadnih pošt
	for (let r = 0; r < tableA.getRowCount(); r++) {
		let newRow = newTable.addRow();
		for (let c = 0; c < tableA.columns.length; c++) {
			newRow.set(
				tableA.columns[c],
				tableA.getString(r, tableA.columns[c])
			);
		}
	}

	// Dodamo vrstice posebnizh pošt
	for (let r = 0; r < tableB.getRowCount(); r++) {
		let newRow = newTable.addRow();
		for (let c = 0; c < tableB.columns.length; c++) {
			newRow.set(
				tableB.columns[c],
				tableB.getString(r, tableB.columns[c])
			);
		}
	}

	// vrnemo novo vstvarjeno tabelo
	return newTable;
}

// metoda, ki mapira koordinate x zemljevida v zaslonske koordinate
function mapX(x) {
	return map(x, minX, maxX, mapX1, mapX2);
}

// metoda, ki mapira koordinate y zemljevida v zaslonske koordinate
function mapY(y) {
	return map(y, minY, maxY, mapY2, mapY1);
}

// metoda za inicializacijo pojavnega okna
function createPopUp() {
	//Naredimo popup ko je samo ena posta
	popup = createDiv("");
	// pojavnemu oknu dodamo stile
	popup.style("background-color", "transparent");
	popup.style("font-family", "monospace");
	popup.style("font-size", "15px");
	popup.style("color", popupColor);
	popup.style("width", "fit-content");
	popup.hide(); // Na začetku je skrit
}

// metoda za centriranje canvasa na strani
function centerCanvas() {
	let centerX = (windowWidth - width) / 2;
	let centerY = (windowHeight - height) / 2;
	canvas.position(centerX, centerY);
}

// metoda, ki izvaja LCC projekcijo lat in lon koordinat
function projectionLCC(lat, lon) {
	let rho = F / pow(tan(PI / 4 + lat / 2), n);
	let theta = n * (lon - lambda0);

	let x = rho * sin(theta);
	let y = rho0 - rho * cos(theta);

	return [x, y];
}

// Predprocesiranje prebranih podatkov o poštah iz .csv datotek
function setUpPreprocessing(t) {
	// dodamo stolpec, ki bo predstavljal barvo te vrstice v danem trenutku
	t.addColumn("newColor"); // hočemo, da je pika te barve
	t.addColumn("currColor"); // pika je trenutno te barve
	// projeciramo zemljepisno širino in višino za vsak zapis v tabeli
	for (let row = 0; row < t.getRowCount(); row++) {
		// preberemo zemljepisno višino in širino za določeno pošto
		let lat = t.getNum(row, "latitude");
		let lon = t.getNum(row, "longitude");
		// projeciramo koordinate
		let xy = projectionLCC(radians(lat), radians(lon));
		// shranimo projecirane koordinate
		t.setNum(row, "latitude", xy[0]);
		t.setNum(row, "longitude", xy[1]);

		// določimo ali gre za posebno ali navadno pošto ter ji določimo začetno barvo
		let specialOffice = t.getString(row, "specialOffice") !== "";
		if (specialOffice) {
			t.setString(row, "newColor", pointsColor);
			t.setString(row, "currColor", pointsColor);
		} else {
			t.setString(row, "newColor", "");
			t.setString(row, "currColor", pointsColor);
		}
	}
	return t;
}

// bolj spošno predprocesiranje, ki se izvaja tudi med uporabo same vizualzacije (ob prehodu med navadnimi in posebnimi poštami)
function preprocessing() {
	maxX = -1;
	minX = 1;
	maxY = -1;
	minY = 1;

	for (let row = 0; row < table.getRowCount(); row++) {
		// preberemo zemljepisno višino in širino za določeno pošto
		let lat = table.getNum(row, "latitude");
		let lon = table.getNum(row, "longitude");
		// preverimo ali imamo novo max ali min x ali y koordinato
		if (lat > maxX) maxX = lat;
		if (lat < minX) minX = lat;
		if (lon > maxY) maxY = lon;
		if (lon < minY) minY = lon;

		let specialOffice = table.getString(row, "specialOffice");
		if (switchActive && specialOffice !== "") {
			// če je posebna pošta, ji dodelimo posebno barvo
			table.setString(row, "newColor", pointsColor);
		} else if (switchActive && specialOffice === "") {
			// če ni posebna pošta, ji dodelimo osnovno barvo
			table.setString(row, "newColor", grayedOutColor);
		} else if (!switchActive && specialOffice !== "") {
			// če je posebna pošta, ji dodelimo posebno barvo
			table.setString(row, "newColor", "");
		} else {
			// najprej vsaki vrstici barvo nastavimo na osnovno
			table.getRow(row).setString("newColor", pointsColor);
		}
	}
	// nastavimo orginalne min in max x in y koordinate
	originalMaxX = maxX;
	originalMaxY = maxY;
	originalMinX = minX;
	originalMinY = minY;

	// na začetku želene min in max x in y koordinate nastvimo enako kot orginalne
	targetMaxX = maxX;
	targetMaxY = maxY;
	targetMinX = minX;
	targetMinY = minY;

	// določimo začeno sredino zemljevida
	midX = mapX((maxX + minX) / 2);
	midY = mapY((maxY + minY) / 2);
	targetX = midX;
	targetY = midY;
}

// nastavljanja stilov besedil in gumbov na strani
function createText() {
	// pridobimo elemente
	textZoom = createP("Povečava");
	textType = createP("Vnesite poštno številko");
	textSpecila = createP("Prikaži posebne pošte");
	switchButton = select("#mySwitch");
	textNavodila = select("#navodila");

	// gumbu nastavimo handler ob pritisku
	switchButton.mousePressed(toggleSwitch);

	// nastavimo pisavo
	textZoom.style("font-family", "monospace");
	textType.style("font-family", "monospace");
	textSpecila.style("font-family", "monospace");
	textNavodila.style("font-family", "monospace");

	// nastavimo velikost pisave
	textZoom.style("font-size", "16px");
	textType.style("font-size", "20px");
	textSpecila.style("font-size", "16px");
	textNavodila.style("font-size", "12px");

	// nastavimo barvo besedila
	textZoom.style("color", unhighlightedColor);
	textType.style("color", unhighlightedColor);
	textSpecila.style("color", unhighlightedColor);
	textNavodila.style("color", unhighlightedColor);

	// nastavimo pozicije vsem html elementom
	positionText();
}

// metoda za nastavljanje pozicij besedil na strani
function positionText() {
	textType.position(canvas.x - 10, canvas.y);

	textSpecila.position(canvas.x + width - 155, canvas.y + height - 30);
	textZoom.position(canvas.x + width - 15, canvas.y + height - 50);

	textNavodila.position(canvas.x - 10, canvas.y + height - 30);

	textZoom.mousePressed(handleClick); // dodamo handler, ob pritisku na zoom
	textZoom.style("cursor", "pointer"); // nastavimo izgled kurzorja

	switchButton.position(canvas.x + width + 35, canvas.y + height - 10);
	switchButton.addClass("switch"); // Dodamo razred s stili stikalu

	// kaj se zgodi ob spremembi
	switchButton.changed(() => {
		textSpecila.style(
			"color",
			switchButton.checked() ? highlightedColorText : unhighlightedColor // nastavljanje barve besedila
		);
		isSwitchedOn = switchButton.checked(); // nastavljanje spremenljivke, ki določa ali so posebne pošte vklopljene
	});
}

// spremenljivka, ki hrani vse narisan pošte (tiste, ki so izbrane, ko jih je manj kot ali natanko 10)
let drawnPosts = [];
// spremenljivka, ki določa koliko je bližnjih točk (tiste, ki se ob izpisu prekrivajo)
let numberNear = 0;
// metoda za barvanje pošt ob iskanju
function colorPosts(less) {
	drawnPosts = [];
	numberNear = 0;
	// gremo čez vse pošte
	for (let i = 0; i < table.getRowCount(); i++) {
		// preberemo zemljepisno višino in širino za določeno po
		let x = table.getNum(i, "latitude");
		let y = table.getNum(i, "longitude");
		// preberemo barvo, ki jo moramo uporabiti za to pošto
		let newColor = table.getString(i, "newColor");
		// preverimo ali je trenutna pošta izbrana (natanko njena poštna številka je vpisana) ter ali je vklopljeno iskanje poštnih številk
		let specialOffice = table.getString(i, "specialOffice") !== "";
		if ((!specialOffice && !switchActive) || switchActive) {
			if (match !== -1 && match === i) {
				// če imamo natanko določeno pošto jo drugače izrišemo
				drawChoosen(x, y, newColor, i);
			} else {
				// sicer jih vse enako izrišemo
				drawPost(
					x,
					y,
					newColor,
					i,
					less && newColor === highlightedColor
				);
			}
		}
	}
}

// metoda za izris natanko izbrane pošte
function drawChoosen(x, y, newColor, index) {
	// pobriše vse na drugi plasi
	layer2.clear();
	// pridobi podatke o pošti
	let postalCode = table.getString(index, "postalCode");
	let place = table.getString(index, "place");
	let specialOffice = table.getString(index, "specialOffice");
	// nastavi x in y koordinate točno izbrane pošte
	chosenX = x;
	chosenY = y;
	// x in y koordinate mapira v zaslonske koordinate
	let xx = mapX(x);
	let yy = mapY(y);
	// določimo barvo s katero se bo izrisala izbrana pošta ter velikost kvadratka, ki se po izrisal
	layer2.stroke(newColor);
	layer2.strokeWeight(4);
	table.setString(index, "currColor", newColor);
	layer2.rect(xx, yy, 3, 3);
	// v pojavnem oknu izpišemo podatke o pošti
	if (specialOffice === "") {
		// če je navadna pošta izpišemo le kraj in poštno številko
		popup.html(place + ", " + postalCode);
	} else {
		// če je posebna pošta izpišemo še podjetje/ustanov na katero se nanaša
		popup.html(specialOffice + ", " + place + ", " + postalCode);
	}
	// prikažemo pojavno okno
	popup.show();
	let relativeX = xx + canvas.x - popup.html().length * 5;
	let relativeY = yy + canvas.y - 30;
	popup.position(relativeX, relativeY);
}

// spremenljivka, ki določa min razdaljo na kateri moreta biti točki, da se ne prekrivata
let offsetthreshold = 2;
function drawPost(x, y, newColor, index, less) {
	// x in y preslikamo v zaslonske koordinate
	let xx = mapX(x);
	let yy = mapY(y);
	// preberemo podatke o pošti
	let currColor = table.getString(index, "currColor");
	let postalCode = table.getString(index, "postalCode");
	let lastDigit = postalCode.charAt(postalCode.length - 1);
	// barvo določamo z iterpolacijo med začetno in želeno vrednostjo, da so prehodi bolj mehki
	let blendColor = lerpColor(color(currColor), color(newColor), 0.1);
	layer1.stroke(blendColor);
	// Izpis imena poste če gremo čez njo z miško
	if (
		(dist(mouseX, mouseY, xx, yy) < 5 && match == -1) ||
		(less && dist(mouseX, mouseY, xx, yy) < 5 && match == -1)
	) {
		let postalCode = table.getString(index, "postalCode");
		let place = table.getString(index, "place");
		let specialOffice = table.getString(index, "specialOffice");
		if (specialOffice && switchActive) {
			let displayText = `${specialOffice}, ${place}, ${postalCode}`;
			popup.html(displayText);
			popup.show();
			let relativeX = xx + canvas.x - popup.html().length * 5;
			let relativeY = yy + canvas.y - 30;
			popup.position(relativeX, relativeY);
		} else if (!switchActive) {
			let displayText = `${place}, ${postalCode}`;
			popup.html(displayText);
			popup.show();
			let relativeX = xx + canvas.x - popup.html().length * 5;
			let relativeY = yy + canvas.y - 30;
			popup.position(relativeX, relativeY);
		}
	}
	// če ja manj kot 10 pošt, so že vpisane 3 cifre in je vklopljen zoom, namesto pik izpišemo zadnjo cifro poštne številke
	if (less) {
		let offset = 10 * pow(-1, numberNear + 1);
		// Preverimo ali se pošta prekriva s katero od že izpiwsanih
		for (let pos of drawnPosts) {
			let dX = abs(xx - pos.xx);
			let dY = abs(yy - pos.yy);
			if (dX < offsetthreshold) {
				// Dodamo majhen odmik pri izpisu
				numberNear++;
				xx += offset;
				break;
			} else if (dY < offsetthreshold) {
				numberNear++;
				yy += offset;
				break;
			}
		}

		layer1.noStroke();
		layer1.fill(blendColor);
		// Izpišemo zadnjo cifro namesto pike
		layer1.textSize(12); // Nastavimo velikost izpisa številke
		layer1.text(lastDigit, xx, yy);

		drawnPosts.push({ xx, yy });
	} else {
		// Sicer izrišemo točko na zemljevidu
		layer1.strokeWeight(2);
		layer1.point(xx, yy);
	}
	// nastavimo barvo točke
	table.setString(index, "currColor", blendColor);
}

// metoda, ki uravnava pozicije elementov ob spremembi velikosti okna brskalnika
function windowResized() {
	resizeCanvasToAspect();
	layer1 = createGraphics(width, height);
	layer2 = createGraphics(width, height);
	centerCanvas();
	positionText();

	mapX1 = 60;
	mapX2 = width - 60;
	mapY1 = 60;
	mapY2 = height - 60;

	xx = mapX(chosenX);
	yy = mapY(chosenY);

	let relativeX = xx + canvas.x - popup.html().length * 5;
	let relativeY = yy + canvas.y - 30;
	popup.position(relativeX, relativeY);
}

function resizeCanvasToAspect() {
	let availableWidth = windowWidth - 2 * 60;
	let availableHeight = windowHeight - 2 * 60;

	if (availableWidth / availableHeight > aspectRatio) {
		let canvasHeight = availableHeight;
		let canvasWidth = canvasHeight * aspectRatio;
		resizeCanvas(canvasWidth, canvasHeight);
	} else {
		let canvasWidth = availableWidth;
		let canvasHeight = canvasWidth / aspectRatio;
		resizeCanvas(canvasWidth, canvasHeight);
	}
}

// metoda, ki obravnava tipkanje v aplikqaciji
function keyPressed() {
	// če je vpisana katerakoli cifra med 0 in 9
	if (key >= "0" && key <= "9") {
		// če je vsaj že ena vpisana in manj kot 4 cifre
		if (typeCount > 0 && typeCount < 4) {
			// nastavimo besedilo, ki prikazuje vpisane številke
			let currentText = textType.html();
			let newText = currentText + key;
			typeCount++;
			textType.html(newText);
			// sprožimo iskanje pošt
			findPost(newText);
			// popravimo koordinate (če je zoom vklopljen)
			updateCorrdinates();
			// če je še le prva cifra vpisana
		} else if (typeCount === 0) {
			// nastavimo izpis vpisanih cifr ter barvo izpisa
			textType.html(key);
			typeCount++;
			textType.style("color", highlightedColorText);
			// sprožimo iskanje pošt
			findPost(key);
			// popravimo koordinate (če je zoom vklopljen)
			updateCorrdinates();
		}
		// če hočemo pobrisati izpis (kakšno cifro iz izpisa)
	} else if (key === "Backspace" || key === "Delete") {
		if (typeCount > 0) {
			// skrijemo pojavno okno (če je prikazano)
			popup.hide();
			// popravimo izpis in koordinate na zemljevidu
			typeCount--;
			let currentText = textType.html();
			let newText = currentText.substring(0, currentText.length - 1);
			textType.html(newText);
			if (typeCount === 0) {
				textType.html("Vnesite poštno številko");
				textType.style("color", unhighlightedColor);
				reset = true;
				updateCorrdinates();
			} else {
				if (typeCount === 3) {
					clearLayer = true;
				}
				// če je še vedno kakšna številka izpisana sprožimo iskanje
				findPost(newText);
				updateCorrdinates();
			}
		}
		// če je vpisana čka "p" vklopimo zoom
	} else if (key === "p" || key === "P") {
		if (zoomActive === 0) {
			zoomActive = 1;
			textZoom.style("color", highlightedColorText);
			updateCorrdinates();
		} else if (zoomActive === 1) {
			zoomActive = 0;
			textZoom.style("color", unhighlightedColor);
			updateCorrdinates();
			clearLayer = true;
		}
	}
}

// metoda za posodabljanje koordinat
function updateCorrdinates() {
	// če je zoom vklopljen
	if (zoomActive === 1) {
		// in ni vpisana nobena številka
		if (typeCount === 0) {
			// želene min in max x in y koordinate nastavimo na začetne
			targetMaxX = originalMaxX;
			targetMinX = originalMinX;
			targetMaxY = originalMaxY;
			targetMinY = originalMinY;
		} else {
			// sicer jih posodobimo glede na najdene točke
			if (anyMatches > 0) {
				targetMaxX = newMaxX;
				targetMinX = newMinX;
				targetMaxY = newMaxY;
				targetMinY = newMinY;
			}
		}
	} else {
		// sicer želene min in max x in y koordinate nastavimo na začetne
		targetMaxX = originalMaxX;
		targetMinX = originalMinX;
		targetMaxY = originalMaxY;
		targetMinY = originalMinY;
	}
}

// metoda, ki obravnava klike na besedo zoom
function handleClick() {
	// če je zoom nekativen ga aktiviramo in posodobimo koordinate
	if (zoomActive === 0) {
		zoomActive = 1;
		textZoom.style("color", highlightedColorText);
		updateCorrdinates();
	} else if (zoomActive === 1) {
		// sicer ga deaktiviramo in prav tako posodobimo koordinate
		zoomActive = 0;
		textZoom.style("color", unhighlightedColor);
		updateCorrdinates();
		clearLayer = true;
	}
}

// flag ali lahko na zemljevid že rišemo (počakamo dokler posebne pošte ali navadne pošte niso (ponovno pripravljene))
let canDraw = true;
function toggleSwitch() {
	canDraw = false;
	// ali so posebne pošte aktivne negiramo (če so vklopljene jih izklopimo sicer jih vklopimo)
	switchActive = !switchActive;
	// nastavimo barvo besedila in stikala
	textSpecila.style(
		"color",
		switchActive ? highlightedColorText : unhighlightedColor
	);

	// pobrišemo vse iz canvasa
	clear();
	layer1.clear();
	layer2.clear();

	// določimo razred z določenimi stili stikalu
	if (!switchActive) {
		switchButton.removeClass("checked");
	} else {
		switchButton.addClass("checked");
	}

	// ponovno predprocesiramo podatke
	preprocessing();
	if (typeCount > 0) {
		// če je kakšna cifra že vpisana sprožimo iskanje in pososdobimo koordinate
		findPost(textType.html());
		updateCorrdinates();
	}
	// sedaj lahko ponovno rišemo na canvas
	canDraw = true;
}

// metoda za iskanje pošt gled ena vnesen niz
function findPost(searchValue) {
	// resetiramo ali imamo popolno ujemanje, število najdenih in nove min in max x in y koordinate
	match = -1;
	anyMatches = 0;
	newMinX = 1;
	newMaxX = -1;
	newMinY = 1;
	newMaxY = -1;
	// Gremo čez vse vrstice
	for (let r = 0; r < table.getRowCount(); r++) {
		// pridobimo podatke pošte
		let postalCode = table.getString(r, "postalCode"); // Pridobimo vrednost poštne številke za trenutno vrstico
		let lat = table.getNum(r, "latitude");
		let lon = table.getNum(r, "longitude");
		// preverimo ali je pošta med posebnimi
		let isSpecial = table.getString(r, "specialOffice") !== "";
		// Preverimo ali se začne s searchValue
		if (
			postalCode.startsWith(searchValue) &&
			((switchActive && isSpecial) || (!switchActive && !isSpecial))
		) {
			// če se povečamo število najdenih, ji nastavimo novo barvo in preverimo ali imamo nove min ali max, x ali y vrednosti
			anyMatches++;
			table.setString(r, "newColor", highlightedColor);
			if (lat > newMaxX) newMaxX = lat;
			if (lat < newMinX) newMinX = lat;
			if (lon > newMaxY) newMaxY = lon;
			if (lon < newMinY) newMinY = lon;

			// preverimo ali gre za popolno ujemanje
			if (searchValue.length === 4) {
				match = r;
			}
		} else {
			// sicer ji določimo osiveno barvo
			table.setString(r, "newColor", unhighlightedColor);
		}
	}
	// če ni ujemanj, nastavimo barvo besedila
	if (anyMatches === 0) {
		textType.style("color", badSearchColor);
	} else {
		// sicer popravimo želene centralne ter min in max koordinate ter tudi barvo besedila
		textType.style("color", highlightedColorText);
		targetX = (newMaxX + newMinX) / 2;
		targetY = (newMaxY + newMinY) / 2;

		// izračunamo razpon x in z y koordinat (dejansko polovica razpona)
		let viewX = abs(newMaxX - newMinX) / 2;
		let viewY = abs(newMaxY - newMinY) / 2;

		// če je najdena samo ena točka, ji ročno nastavimo vidno polje na zemljevidu (okrog točke)
		if (viewX === 0 && viewY === 0) {
			if (typeCount === 4) {
				viewX = abs(maxX - minX) / 2;
				viewY = abs(maxY - minY) / 2;
			} else {
				viewX = 0.001;
				viewY = 0.0007;
			}
		}

		// Določimo razmerje višine in širine vidnega polja
		let canvasAspectRatio = width / height;
		let subsetAspectRatio = viewX / viewY;

		// Popravimo razmerje, da je enako kot razmerje na šačetnem zemljevidu (razmerje canvasa)
		if (subsetAspectRatio > canvasAspectRatio) {
			// če je podmnožica širša od canvasa prilagodimo razpon y
			viewY = viewX / canvasAspectRatio;
		} else {
			// če je podmnožica višja od canvasa prilagodimo razpon x
			viewX = viewY * canvasAspectRatio;
		}
		// centralnim koordinatam dodamo odmik za polovico popravljenega razpona ter to nastavimo za nove min in max x in y koordinate
		// množimo z 1.2 polovico razpona, da dodamo majhen padding najdenim točkam od konca/začetka canvasa
		newMinX = targetX - viewX * 1.2;
		newMaxX = targetX + viewX * 1.2;
		newMinY = targetY - viewY * 1.2;
		newMaxY = targetY + viewY * 1.2;
	}
}

// vsem točkam nastavimo barve na začetne vrednosti, glede na to ali prikazujemo posebne ali navadne pošte
function resetColor() {
	for (let r = 0; r < table.getRowCount(); r++) {
		if (switchActive) {
			if (table.getString(r, "specialOffice") !== "") {
				table.setString(r, "newColor", pointsColor);
			} else {
				table.setString(r, "newColor", grayedOutColor);
			}
		} else {
			if (table.getString(r, "specialOffice") !== "") {
				table.setString(r, "newColor", "");
			} else {
				table.setString(r, "newColor", pointsColor);
			}
		}
	}
	colorPosts(false);
}

// spremenljivke, ki hranijo dejansko (trenutno) sredinisko točko ter želeno sredinsko točko
let midX, midY;
let targetX, targetY;
// ali resetiramo prikaz
let reset = true;
function draw() {
	// nastavimo barvo ozadja
	background(backgroundColor);
	// skrijemo pojavno okno če je prikazano
	popup.hide();

	// če podatki niso pripravljeni preskočimo to iteracijo
	if (!dataReady || !canDraw) {
		return;
	}

	// pobrišemo prvo plast
	clear();
	layer1.clear();

	// interpoliramo med trenutnimi in želenimi vrednosti za lepše premikanje po zemljevidu pri zoomiranju
	midX = lerp(midX, targetX, 0.08);
	midY = lerp(midY, targetY, 0.08);
	minX = lerp(minX, targetMinX, 0.08);
	maxX = lerp(maxX, targetMaxX, 0.08);
	maxY = lerp(maxY, targetMaxY, 0.08);
	minY = lerp(minY, targetMinY, 0.08);

	// ali resetiramo prikaz (barve)
	if (reset && typeCount === 0) {
		resetColor();
		reset = false;
	} else {
		// pobarvamo / narišemo pošte
		colorPosts(anyMatches < 10 && zoomActive === 1 && typeCount === 3);
	}

	// prikažemo prvo plast
	image(layer1, 0, 0);

	// če je potrebno vse izbrišemo
	if (clearLayer) {
		clear();
		layer2.clear();
		layer1.clear();
		clearLayer = false;
	}

	// če je popolno ujemanje narišemo še drugo plast
	if (typeCount === 4) {
		image(layer2, 0, 0);
	}
}
