// speremenljivka, ki bo hranila naš canvas
let canvas;

// spremenljivke, ki bodo hranile besedilo na strani
let textType, textZoom, textSpecila, textNavodila;
let typeCount = 0; // koliko znakov je uporabnik napisla
let zoomActive = 0;
let specialPosts = 0;

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

// v to spremenljivko shranimo tabelo iz poste.csv datoteke
let poste;
let posebnePoste;
let table;

// spremenljivke določajo minimalne in maksimalne zemljepisne višine in širine (po izvajanju LCC projekcije)
let maxX = -1; // maksimalna latituda po projeciranju
let minX = 1; // minimalna latituda po projeciranju
let maxY = -1; // maksimalna longituda po projeciranju
let minY = 1; // minimalna longituda po projeciranju

let targetMaxX = 0;
let targetMinX = 0;
let targetMaxY = 0;
let targetMinY = 0;

let originalMaxX = -1; // maksimalna latituda pred projeciranjem
let originalMinX = 1; // minimalna latituda pred projeciranjem
let originalMaxY = -1; // maksimalna longituda pred projeciranjem
let originalMinY = 1; // minimalna longituda pred projeciranjem
// Meje v katarih naj se zemljevid prikazuje
let mapX1, mapY1, mapX2, mapY3;

let newMinX = 1;
let newMaxX = -1;
let newMinY = 1;
let newMaxY = -1;

let anyMatches = 0;
let match = -1;

// določimo barve za različne scenarije
const backgroundColor = "#212120";
const pointsColor = "#FFD541";
const highlightedColorText = "#f7e8b2";
const highlightedColor = "#ffffff";
const unhighlightedColor = "#4a4737";
const badSearchColor = "#e6b502";
const popupColor = "#fcf7e3";
const grayedOutColor = "#363530";

// pojavno okno, ki se prikaže ime pošte
let popup;

// spremenljivka, ki določa ali pobrišemo narisane točke
let clearLayer = false;

// spremenljivka, ki določa x in y koordinate izbrane pošte
let chosenX, chosenY;

// ali je priprava podatkov končana
let dataReady = false;

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

function setup() {
	// nastaivimo velikost canvasa in ga ustvarimo
	let canvasWidth = (3 * 920) / 4;
	let canvasHeight = (3 * 653) / 4;
	canvas = createCanvas(canvasWidth, canvasHeight);

	// ustvarimo 3 plasti, ki jih bomo uporabili za risanje
	layer1 = createGraphics(canvasWidth, canvasHeight);
	layer2 = createGraphics(canvasWidth, canvasHeight);
	layer3 = createGraphics(canvasWidth, canvasHeight);

	// centriramo canvas
	centerCanvas();

	// ustvarimo besedilo na strani
	createText();

	// določimo meje zemljevida
	mapX1 = 10;
	mapX2 = width - mapX1;
	mapY1 = 10;
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

	poste = setUpPreprocessing(poste);
	posebnePoste = setUpPreprocessing(posebnePoste);
	table = joinTables(poste, posebnePoste);

	// predprocesiranje podatkov
	preprocessing();
	dataReady = true;

	// inicializiramo pojavnostno okno za prikaz imena pošte
	createPopUp();
}

// Function to join two tables
function joinTables(tableA, tableB) {
	let newTable = new p5.Table();

	// Add columns
	for (let c = 0; c < tableA.columns.length; c++) {
		newTable.addColumn(tableA.columns[c]);
	}

	// Add rows from table A
	for (let r = 0; r < tableA.getRowCount(); r++) {
		let newRow = newTable.addRow();
		for (let c = 0; c < tableA.columns.length; c++) {
			newRow.set(
				tableA.columns[c],
				tableA.getString(r, tableA.columns[c])
			);
		}
	}

	// Add rows from table B
	for (let r = 0; r < tableB.getRowCount(); r++) {
		let newRow = newTable.addRow();
		for (let c = 0; c < tableB.columns.length; c++) {
			newRow.set(
				tableB.columns[c],
				tableB.getString(r, tableB.columns[c])
			);
		}
	}

	return newTable;
}

function mapX(x) {
	return map(x, minX, maxX, mapX1, mapX2);
}

function mapY(y) {
	return map(y, minY, maxY, mapY2, mapY1);
}

function createPopUp() {
	//Naredimo popup ko je samo ena posta
	popup = createDiv("");
	popup.style("background-color", "transparent");
	popup.style("font-family", "monospace");
	popup.style("font-size", "15px");
	popup.style("color", popupColor);
	popup.style("width", "fit-content");
	popup.hide(); // Na začetku je skrit
}

function centerCanvas() {
	let centerX = (windowWidth - width) / 2;
	let centerY = (windowHeight - height) / 2;
	canvas.position(centerX, centerY);
}

function projectionLCC(lat, lon) {
	let rho = F / pow(tan(PI / 4 + lat / 2), n);
	let theta = n * (lon - lambda0);

	let x = rho * sin(theta);
	let y = rho0 - rho * cos(theta);

	return [x, y];
}

function setUpPreprocessing(t) {
	// dodamo stolpec, ki bo predstavljal barvo te vrstice v danem trenutku
	t.addColumn("newColor");
	t.addColumn("currColor");
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

function preprocessing() {
	maxX = -1;
	minX = 1;
	maxY = -1;
	minY = 1;
	// projeciramo zemljepisno širino in višino za vsak zapis v tabeli
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
	originalMaxX = maxX;
	originalMaxY = maxY;
	originalMinX = minX;
	originalMinY = minY;

	targetMaxX = maxX;
	targetMaxY = maxY;
	targetMinX = minX;
	targetMinY = minY;

	midX = mapX((maxX + minX) / 2);
	midY = mapY((maxY + minY) / 2);
	targetX = midX;
	targetY = midY;
}

function createText() {
	textZoom = createP("zoom");
	textType = createP("Type the digits of a zip code");
	textSpecila = createP("Show special posts");
	switchButton = select("#mySwitch");
	textNavodila = select("#navodila");
	switchButton.mousePressed(toggleSwitch);

	textZoom.style("font-family", "monospace");
	textType.style("font-family", "monospace");
	textSpecila.style("font-family", "monospace");
	textNavodila.style("font-family", "monospace");

	textZoom.style("font-size", "20px");
	textType.style("font-size", "20px");
	textSpecila.style("font-size", "14px");
	textNavodila.style("font-size", "12px");

	textZoom.style("color", unhighlightedColor);
	textType.style("color", unhighlightedColor);
	textSpecila.style("color", unhighlightedColor);
	textNavodila.style("color", unhighlightedColor);

	positionText();
}

function positionText() {
	textType.position(canvas.x - 30, canvas.y - 30);

	textSpecila.position(canvas.x + width - 150, canvas.y + height - 17);
	textZoom.position(canvas.x + width - 25, canvas.y + height - 50);

	textNavodila.position(canvas.x - 30, canvas.y + height + 50);

	textZoom.mousePressed(handleClick);
	textZoom.style("cursor", "pointer");

	switchButton.position(canvas.x + width - 5, canvas.y + height); // Set the position relative to the canvas
	switchButton.addClass("switch"); // Add a class for custom styling

	// Toggle the variable on checkbox change
	switchButton.changed(() => {
		textSpecila.style(
			"color",
			switchButton.checked() ? highlightedColorText : unhighlightedColor
		);
		isSwitchedOn = switchButton.checked();

		console.log("Switch state:", isSwitchedOn);
	});
}

let drawnPosts = [];
let numberNear = 0;
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
		// preverimo ali je trenutna pošta izbrana
		let specialOffice = table.getString(i, "specialOffice") !== "";
		if ((!specialOffice && !switchActive) || switchActive) {
			if (match !== -1 && match === i) {
				drawChoosen(x, y, newColor, i);
			} else {
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

function drawChoosen(x, y, newColor, index) {
	layer2.clear();
	let postalCode = table.getString(index, "postalCode");
	let place = table.getString(index, "place");
	let specialOffice = table.getString(index, "specialOffice");
	chosenX = x;
	chosenY = y;
	let xx = mapX(x);
	let yy = mapY(y);
	layer2.stroke(newColor);
	layer2.strokeWeight(4);
	table.setString(index, "currColor", newColor);
	layer2.rect(xx, yy, 3, 3);
	if (specialOffice === "") {
		popup.html(place + ", " + postalCode);
	} else {
		popup.html(specialOffice + ", " + place + ", " + postalCode);
	}
	popup.show();
	let relativeX = xx + canvas.x - popup.html().length * 5;
	let relativeY = yy + canvas.y - 30;
	popup.position(relativeX, relativeY);
}

let offsetthreshold = 2;
function drawPost(x, y, newColor, index, less) {
	let xx = mapX(x);
	let yy = mapY(y);
	let currColor = table.getString(index, "currColor");
	let postalCode = table.getString(index, "postalCode");
	let lastDigit = postalCode.charAt(postalCode.length - 1);
	let blendColor = lerpColor(color(currColor), color(newColor), 0.1);
	layer1.stroke(blendColor);
	if (less) {
		let offset = 10 * pow(-1, numberNear + 1);
		// Check for overlap with existing positions
		for (let pos of drawnPosts) {
			let dX = abs(xx - pos.xx);
			let dY = abs(yy - pos.yy);
			if (dX < offsetthreshold) {
				// Apply a small offset if too close
				numberNear++;
				xx += offset;
				break; // Adjust once per overlap
			} else if (dY < offsetthreshold) {
				numberNear++;
				yy += offset;
				break;
			}
		}

		layer1.noStroke();
		layer1.fill(blendColor);
		// Draw the index as text when less is true
		layer1.textSize(12); // Set an appropriate text size
		layer1.text(lastDigit, xx, yy);

		drawnPosts.push({ xx, yy });
	} else {
		// Draw a point when less is false
		layer1.strokeWeight(2);
		layer1.point(xx, yy);
	}
	table.setString(index, "currColor", blendColor);
}

function windowResized() {
	centerCanvas();
	positionText();

	xx = mapX(chosenX);
	yy = mapY(chosenY);

	let relativeX = xx + canvas.x - popup.html().length * 5;
	let relativeY = yy + canvas.y - 30;
	popup.position(relativeX, relativeY);
}

function keyPressed() {
	if (key >= "0" && key <= "9") {
		if (typeCount > 0 && typeCount < 4) {
			let currentText = textType.html();
			let newText = currentText + key;
			typeCount++;
			textType.html(newText);
			findPost(newText);
			updateCorrdinates();
		} else if (typeCount === 0) {
			textType.html(key);
			typeCount++;
			textType.style("color", highlightedColorText);
			findPost(key);
			updateCorrdinates();
		}
	} else if (key === "Backspace" || key === "Delete") {
		if (typeCount > 0) {
			popup.hide();
			typeCount--;
			let currentText = textType.html();
			let newText = currentText.substring(0, currentText.length - 1);
			textType.html(newText);
			if (typeCount === 0) {
				textType.html("Type the digits of a zip code");
				textType.style("color", unhighlightedColor);
				reset = true;
				updateCorrdinates();
			} else {
				if (typeCount === 3) {
					clearLayer = true;
				}
				findPost(newText);
				updateCorrdinates();
			}
		}
	} else if (key === "z" || key === "Z") {
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

function updateCorrdinates() {
	if (zoomActive === 1) {
		if (typeCount === 0) {
			targetMaxX = originalMaxX;
			targetMinX = originalMinX;
			targetMaxY = originalMaxY;
			targetMinY = originalMinY;
		} else {
			if (anyMatches > 0) {
				targetMaxX = newMaxX;
				targetMinX = newMinX;
				targetMaxY = newMaxY;
				targetMinY = newMinY;
			}
		}
	} else {
		targetMaxX = originalMaxX;
		targetMinX = originalMinX;
		targetMaxY = originalMaxY;
		targetMinY = originalMinY;
	}
}

function handleClick() {
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

let canDraw = true;
function toggleSwitch() {
	canDraw = false;
	switchActive = !switchActive;
	textSpecila.style(
		"color",
		switchActive ? highlightedColorText : unhighlightedColor
	);

	clear();
	layer1.clear();
	layer2.clear();
	if (!switchActive) {
		switchButton.removeClass("checked");
	} else {
		switchButton.addClass("checked");
	}

	preprocessing();
	if (typeCount > 0) {
		findPost(textType.html());
		updateCorrdinates();
	}
	canDraw = true;
}

function findPost(searchValue) {
	// Gremo čez vse vrstice
	match = -1;
	anyMatches = 0;

	newMinX = 1;
	newMaxX = -1;
	newMinY = 1;
	newMaxY = -1;
	for (let r = 0; r < table.getRowCount(); r++) {
		let postalCode = table.getString(r, "postalCode"); // Pridobimo vrednost poštne številke za trenutno vrstico
		let lat = table.getNum(r, "latitude");
		let lon = table.getNum(r, "longitude");
		// Preverimo ali se začne s searchValue
		let isSpecial = table.getString(r, "specialOffice") !== "";
		if (
			postalCode.startsWith(searchValue) &&
			((switchActive && isSpecial) || (!switchActive && !isSpecial))
		) {
			anyMatches++;
			table.setString(r, "newColor", highlightedColor);
			if (lat > newMaxX) newMaxX = lat;
			if (lat < newMinX) newMinX = lat;
			if (lon > newMaxY) newMaxY = lon;
			if (lon < newMinY) newMinY = lon;

			if (searchValue.length === 4) {
				match = r;
			}
		} else {
			table.setString(r, "newColor", unhighlightedColor);
		}
	}
	if (anyMatches === 0) {
		textType.style("color", badSearchColor);
	} else {
		textType.style("color", highlightedColorText);
		targetX = (newMaxX + newMinX) / 2;
		targetY = (newMaxY + newMinY) / 2;

		// Step 2: Calculate the ranges for x and y in the selected subset
		let viewX = abs(newMaxX - newMinX) / 2;
		let viewY = abs(newMaxY - newMinY) / 2;

		if (viewX === 0 && viewY === 0) {
			if (typeCount === 4) {
				viewX = abs(maxX - minX) / 2;
				viewY = abs(maxY - minY) / 2;
			} else {
				viewX = 0.001;
				viewY = 0.0007;
			}
		}

		// Step 3: Determine the canvas aspect ratio
		let canvasAspectRatio = width / height;
		let subsetAspectRatio = viewX / viewY;

		// Step 4: Adjust viewX or viewY to match the canvas aspect ratio
		if (subsetAspectRatio > canvasAspectRatio) {
			// Subset is wider than canvas, adjust viewY
			viewY = viewX / canvasAspectRatio;
		} else {
			// Subset is taller than canvas, adjust viewX
			viewX = viewY * canvasAspectRatio;
		}
		newMinX = targetX - viewX;
		newMaxX = targetX + viewX;
		newMinY = targetY - viewY;
		newMaxY = targetY + viewY;
	}
}

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

let scaleFactor = 1;
let targetScale = 1;
let midX, midY;
let targetX, targetY;
let reset = true;
function draw() {
	background(backgroundColor);
	popup.hide();

	if (!dataReady || !canDraw) {
		return;
	}

	clear();
	layer1.clear();

	midX = lerp(midX, targetX, 0.08);
	midY = lerp(midY, targetY, 0.08);
	minX = lerp(minX, targetMinX, 0.08);
	maxX = lerp(maxX, targetMaxX, 0.08);
	maxY = lerp(maxY, targetMaxY, 0.08);
	minY = lerp(minY, targetMinY, 0.08);

	colorPosts(anyMatches < 10 && typeCount === 3 && zoomActive);

	if (reset && typeCount === 0) {
		resetColor();
		reset = false;
	} else {
		colorPosts(anyMatches < 10 && zoomActive === 1 && typeCount === 3);
	}
	image(layer1, 0, 0);

	if (clearLayer) {
		clear();
		layer2.clear();
		layer1.clear();
		clearLayer = false;
	}

	if (typeCount === 4) {
		image(layer2, 0, 0);
	}
}
