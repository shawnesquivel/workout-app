'use strict';

// Create global variables to pass data between function scopes
// Instead,
let map, mapEvent;

////////////////////////////////////////////////////////

// Parent Class
class Workout {
  date = new Date();
  // so that we can index it later
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [latitude/longitude]
    this.distance = distance; // km
    this.duration = duration; // min
  }
  // Set Date Description
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}
////////////////////////////////////////////////////////
// Running Workouts
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance; // min/km
    return this.pace;
  }
}

////////////////////////////////////////////////////////
// Cycling Workouts
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); // km/h
    return this.speed;
  }
}

////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
// popupProps.className = inputType.value + '-popup';
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  constructor() {
    // Get User Position
    this._getPosition();

    // Get Data From Local Storage
    this._getLocalStorage();

    // When form submitted, add marker
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Change the form depending on the workout type
    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    // Create a Google Maps link based on your current location.
    // Use the navigator.geolocation API to get latitude/longitude
    // Parameters: Success Callback, Error Callback
    // Use the bind keyword to pass "this" into the function call
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position!');
        }
      );
  }

  _loadMap(position) {
    // Destructure to take out the {property}
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const url = `https://www.google.com/maps/@${latitude},${longitude}`;
    // console.log(latitude, longitude, url);

    const coords = [latitude, longitude];
    // Task: The following code is from Leaflet
    // L is the main function Leafleft gives
    this.#map = L.map('map', {
      closePopupOnClick: false,
    }).setView(coords, this.#mapZoomLevel);

    // console.log(this);
    // Map is made up of tiles, the link gives the style of the map
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Marker appears on the home location
    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 250,
          minwidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: 'running-popup',
        })
      )
      .setPopupContent('Current Location')
      .openPopup();
    // User Clicks Map - Show the Form
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapEvent) {
    form.classList.remove('hidden');
    inputDistance.focus();
    this.#mapEvent = mapEvent;
  }
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    // disable sliding animation
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // Make sure the number is positive
    const inputsArePositive = (...inputs) => {
      inputs.forEach(value => {
        if (Math.sign(value) !== 1) {
          alert(`${value} must be a positive number`);
        }
      });
    };
    // Make sure the number is an integer (e.g. integer)
    const inputsAreIntegers = (...inputs) => {
      inputs.forEach(value => {
        if (!Number.isFinite(value)) {
          alert(`${value} is not an integer`);
        }
      });
    };

    e.preventDefault();
    // Get data from form (Type, Distance, Duration, Cadence/Elevation)
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const clickCoords = [lat, lng];
    let workout;

    // If workout is running, create a Running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      inputsArePositive(distance, duration, cadence);
      workout = new Running(clickCoords, distance, duration, cadence);
    }

    // Create cycling object
    if (type === 'cycling') {
      // if(cyling)
      const elevation = +inputElevation.value;
      // if (elevation ) {
      //   alert('Elevation must be an integer');
      // }
      inputsArePositive(distance, duration);
      inputsAreIntegers(elevation);
      workout = new Cycling(clickCoords, distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map
    this._renderWorkoutMarker(workout);

    // Add workout to sidebar
    this._renderWorkout(workout);

    // Hide form and clear input fields
    this._hideForm();
    // don't use this as it resets the type as well, messes up the toggle.
    // form.reset()

    // Add workout to local storage
    this._setLocalStorage();
  }

  // Render the Popup Properties
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .bindPopup(
        L.popup({
          maxwidth: 250,
          minwidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type == 'running' ? '🏃‍♂️' : '🚴🏽‍♂️'} ${workout.description}`
      )
      .addTo(this.#map)
      .openPopup();
  }

  // Render Workout
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type == 'running' ? '🏃‍♂️' : '🚴🏽‍♂️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
    }
    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevation}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;
    }
    // Append to workouts ul
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id == workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using public interface
    workout.click();
  }

  _setLocalStorage() {
    // Key Value Storage - only for small amounts of data
    // Note: Stringify eliminates the prototype chain!
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    // Remove workouts from storage
    localStorage.removeItem('workouts');
    // Reload the Page
    location.reload();
  }
}

const app = new App();
