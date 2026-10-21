"use strict";
const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem("token"),
  movies = [],
  movie = null,
  selected = null;
const sections = ["login", "catalog", "reservation", "ticket"];
function show(name) {
  for (const s of sections) $(s + "-section").hidden = s !== name;
  $("logout-btn").hidden = !token;
  window.scrollTo(0, 0);
}
function clearPrivate() {
  movies = [];
  movie = null;
  selected = null;
  $("movie-list").replaceChildren();
  $("seats").replaceChildren();
  $("ticket").replaceChildren();
  $("payment-form").reset();
  $("movie-meta").textContent = "";
  $("movie-synopsis").textContent = "";
  $("booking-film").textContent = "";
}
async function api(path, body) {
  const res = await fetch("/api/v1" + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/login") {
      token = null;
      sessionStorage.removeItem("token");
      clearPrivate();
      show("login");
    }
    const e = Error(data.message);
    e.status = res.status;
    throw e;
  }
  return data;
}
const filmDetails = {
  1: {
    image: "assets/orbita.jpg",
    duration: "128 min",
    age: "12+",
    tag: "ESTRENO",
    subtitle: "EL ÚLTIMO VIAJE ES SOLO EL COMIENZO",
    synopsis:
      "Una señal desde el borde del universo. Una misión que lo cambiará todo.",
    credit: "UNA HISTORIA MÁS ALLÁ DE NUESTRO MUNDO",
  },
  2: {
    image: "assets/pista.jpg",
    duration: "112 min",
    age: "15+",
    tag: "EN CARTELERA",
    subtitle: "TODOS GUARDAN UN SECRETO",
    synopsis:
      "La ciudad no duerme. Y alguien está a punto de descubrir por qué.",
    credit: "NADA ES LO QUE PARECE",
  },
  3: {
    image: "assets/verano.jpg",
    duration: "104 min",
    age: "7+",
    tag: "EN CARTELERA",
    subtitle: "LOS MEJORES PLANES NO SE PLANEAN",
    synopsis:
      "Un viaje inesperado. Un reencuentro. Un verano para volver a empezar.",
    credit: "A VECES SOLO HACE FALTA VOLVER",
  },
};
function renderMovies() {
  const list = $("movie-list");
  list.replaceChildren();
  const visible = movies.filter(
    (m) => !$("genre-filter").value || m.genre === $("genre-filter").value,
  );
  $("movie-count").textContent =
    visible.length + (visible.length === 1 ? " película" : " películas");
  for (const m of visible) {
    const d = filmDetails[m.id];
    const card = document.createElement("article");
    card.className = "movie-card";
    const poster = document.createElement("button");
    poster.className = "poster-link";
    poster.setAttribute("aria-label", "Ver asientos de " + m.title);
    poster.onclick = () => reserve(m).catch(report);
    const img = document.createElement("img");
    img.src = d.image;
    img.alt = "";
    img.loading = "lazy";
    const label = document.createElement("span");
    label.className = "poster-label";
    label.textContent = d.tag;
    const artwork = document.createElement("span");
    artwork.className = "poster-title";
    const subtitle = document.createElement("small");
    subtitle.textContent = d.subtitle;
    const artworkTitle = document.createElement("strong");
    artworkTitle.textContent = m.title.toUpperCase();
    const credit = document.createElement("span");
    credit.textContent = d.credit;
    artwork.append(subtitle, artworkTitle, credit);
    poster.append(img, label, artwork);
    const info = document.createElement("div");
    info.className = "movie-info";
    const top = document.createElement("div");
    top.className = "movie-topline";
    const age = document.createElement("span");
    age.className = "age-tag";
    age.textContent = d.age;
    top.append(
      age,
      document.createTextNode(m.genre + " · " + d.duration + " · 2D"),
    );
    const title = document.createElement("h3");
    title.textContent = m.title;
    const synopsis = document.createElement("p");
    synopsis.textContent = d.synopsis;
    const bottom = document.createElement("div");
    bottom.className = "movie-bottom";
    const price = document.createElement("span");
    price.append(document.createTextNode("Entrada "));
    const value = document.createElement("strong");
    value.textContent = "$" + m.price.toLocaleString("es-CO");
    price.append(value);
    const button = document.createElement("button");
    button.id = "buy-" + m.id;
    button.className = "movie-cta";
    button.append(document.createTextNode("Elegir asientos "));
    const arrow = document.createElement("span");
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");
    button.append(arrow);
    button.onclick = () => reserve(m).catch(report);
    bottom.append(price, button);
    info.append(top, title, synopsis, bottom);
    card.append(poster, info);
    list.append(card);
  }
}
function report(e) {
  $("global-error").textContent = e.message;
}
async function catalog() {
  if (!token) {
    show("login");
    return;
  }
  movies = (await api("/movies")).data;
  renderMovies();
  show("catalog");
}
async function reserve(m) {
  movie = m;
  selected = null;
  $("selection").textContent = "Ningún asiento seleccionado";
  $("pay-btn").disabled = true;
  $("payment-form").reset();
  $("payment-error").textContent = "";
  $("movie-title").textContent = m.title;
  const details = filmDetails[m.id];
  $("reservation-banner").style.backgroundImage =
    'url("' + details.image + '")';
  $("movie-meta").textContent =
    m.genre + " · " + details.duration + " · " + details.age + " · 2D";
  $("movie-synopsis").textContent = details.synopsis;
  $("booking-film").textContent = m.title + " · Sala 01";
  const seats = (await api("/movies/" + m.id + "/seats")).data;
  $("seats").replaceChildren();
  for (const s of seats) {
    const b = document.createElement("button");
    b.id = "seat-" + s.seat;
    b.className = "seat";
    b.textContent = s.seat;
    b.disabled = Boolean(s.occupied);
    b.setAttribute("aria-pressed", "false");
    b.onclick = () => {
      selected = s.seat;
      for (const c of $("seats").children)
        c.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-pressed", "true");
      $("selection").textContent =
        "Asiento " + selected + " · $" + m.price.toLocaleString("es-CO");
      $("pay-btn").disabled = false;
    };
    $("seats").append(b);
  }
  show("reservation");
  location.hash = "reserva";
}
$("login-form").onsubmit = async (e) => {
  e.preventDefault();
  $("login-error").textContent = "";
  try {
    const data = await api("/auth/login", {
      email: $("email-input").value,
      password: $("password-input").value,
    });
    token = data.token;
    sessionStorage.setItem("token", token);
    $("password-input").value = "";
    location.hash = "cartelera";
    await catalog();
  } catch (err) {
    $("login-error").textContent = err.message;
  }
};
$("genre-filter").onchange = renderMovies;
$("payment-form").onsubmit = async (e) => {
  e.preventDefault();
  if (!selected) return;
  $("pay-btn").disabled = true;
  $("payment-error").textContent = "";
  try {
    const { ticket } = await api("/reservations", {
      movieId: movie.id,
      seat: selected,
      card: $("card-input").value,
    });
    $("card-input").value = "";
    $("ticket").textContent =
      ticket.title +
      " | Asiento " +
      ticket.seat +
      " | Total $" +
      ticket.total +
      " | Código " +
      ticket.id;
    show("ticket");
    location.hash = "ticket";
  } catch (err) {
    $("payment-error").textContent = err.message;
    $("pay-btn").disabled = false;
  }
};
$("logout-btn").onclick = async () => {
  try {
    await api("/auth/logout", {});
  } catch (e) {
    report(e);
  } finally {
    token = null;
    sessionStorage.removeItem("token");
    clearPrivate();
    history.replaceState(null, "", "#login");
    show("login");
  }
};
$("back-btn").onclick = $("new-purchase-btn").onclick = () => {
  location.hash = "cartelera";
  catalog().catch(report);
};
window.addEventListener("popstate", () => {
  if (!token) {
    clearPrivate();
    show("login");
  } else if (location.hash === "#cartelera") catalog().catch(report);
});
window.addEventListener("pageshow", () => {
  if (!sessionStorage.getItem("token")) {
    token = null;
    clearPrivate();
    show("login");
  }
});
catalog().catch(report);
