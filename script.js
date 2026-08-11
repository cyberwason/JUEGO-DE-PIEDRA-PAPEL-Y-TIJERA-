/* ================================================================
   PPT ARENA · LÓGICA DEL JUEGO (JavaScript puro, sin dependencias)
   ------------------------------------------------------------
   Índice de módulos (usa Ctrl/Cmd + F para saltar rápido):
     1. REFERENCIAS AL DOM
     2. ESTADO GLOBAL DEL JUEGO
     3. MÓDULO DE AUDIO (Web Audio API - sintetizador de sonidos)
     4. MÓDULO DE TEMA (claro / oscuro)
     5. LÓGICA DE RONDAS (quién gana, sumar puntos, quitar vidas)
     6. ACTUALIZACIÓN DE LA INTERFAZ (pintar en pantalla)
     7. CONTROL DE PARTIDA (pausa, reinicio, game over)
     8. EVENT LISTENERS (conectar botones con funciones)
     9. INICIALIZACIÓN
   ================================================================ */


/* ================================================================
   1. REFERENCIAS AL DOM
   ------------------------------------------------------------
   Guardamos aquí todos los elementos del HTML que vamos a leer o
   modificar, para no tener que buscarlos varias veces.
   ================================================================ */
const elementos = {
  // Marcador
  puntuacion: document.getElementById('puntuacion'),
  vidas: document.getElementById('vidas'),
  corazones: document.querySelectorAll('.corazon'),

  // Mesa VS
  jugadaJugador: document.getElementById('jugadaJugador'),
  jugadaCpu: document.getElementById('jugadaCpu'),
  vsCentral: document.querySelector('.vs-central'),
  mensajeResultado: document.getElementById('mensajeResultado'),

  // Botones de jugada
  botonesJugada: document.querySelectorAll('.btn-jugada'),

  // Controles de partida
  btnPausa: document.getElementById('btnPausa'),
  btnReiniciar: document.getElementById('btnReiniciar'),
  btnReanudar: document.getElementById('btnReanudar'),
  btnJugarDeNuevo: document.getElementById('btnJugarDeNuevo'),

  // Overlays
  overlayPausa: document.getElementById('overlayPausa'),
  overlayGameOver: document.getElementById('overlayGameOver'),
  puntuacionFinal: document.getElementById('puntuacionFinal'),

  // Controles globales (tema y sonido)
  btnSonido: document.getElementById('btnSonido'),
  iconoSonido: document.getElementById('iconoSonido'),
  btnTema: document.getElementById('btnTema'),
  iconoTema: document.getElementById('iconoTema'),
};


/* ================================================================
   2. ESTADO GLOBAL DEL JUEGO
   ------------------------------------------------------------
   Un único objeto con todo el estado actual de la partida.
   Mantenerlo centralizado facilita depurar y ampliar el juego.
   ================================================================ */
const estadoJuego = {
  puntuacion: 0,
  vidas: 3,
  vidasMaximas: 3,
  enPausa: false,
  juegoTerminado: false,
  rondaEnCurso: false, // evita hacer click varias veces mientras se resuelve una ronda
  sonidoActivo: true,
};

// Puntos que se otorgan/quitan por resultado de ronda (fácil de ajustar)
const PUNTOS_VICTORIA = 100;
const PUNTOS_EMPATE = 20;

// Opciones posibles del juego y qué emoji representa a cada una
const OPCIONES = ['piedra', 'papel', 'tijera'];
const EMOJIS = {
  piedra: '✊',
  papel: '✋',
  tijera: '✌️',
};

// Reglas del juego: la clave vence al valor indicado
const REGLAS_VICTORIA = {
  piedra: 'tijera', // piedra vence a tijera
  papel: 'piedra',  // papel vence a piedra
  tijera: 'papel',  // tijera vence a papel
};


/* ================================================================
   3. MÓDULO DE AUDIO (Web Audio API)
   ------------------------------------------------------------
   Generamos todos los efectos de sonido con osciladores en lugar
   de archivos .mp3, así el juego nunca falla por un audio que no
   carga (ideal para desplegar en Vercel sin dependencias extra).
   ================================================================ */
const AudioJuego = (() => {
  // El AudioContext se crea una sola vez y se reutiliza.
  // Se crea "perezosamente" (la primera vez que se necesita) porque
  // los navegadores exigen una interacción del usuario antes de sonar.
  let contexto = null;

  function obtenerContexto() {
    if (!contexto) {
      const AudioContextClase = window.AudioContext || window.webkitAudioContext;
      contexto = new AudioContextClase();
    }
    // Algunos navegadores suspenden el audio hasta el primer gesto del usuario
    if (contexto.state === 'suspended') {
      contexto.resume();
    }
    return contexto;
  }

  /**
   * Reproduce una nota simple (oscilador) con una envolvente de
   * volumen para que no "clickee" al empezar o terminar.
   * @param {number} frecuenciaInicial - frecuencia en Hz al iniciar
   * @param {number} frecuenciaFinal - frecuencia en Hz al terminar (permite "planeos")
   * @param {number} duracion - duración en segundos
   * @param {string} tipoOnda - 'sine' | 'square' | 'sawtooth' | 'triangle'
   * @param {number} inicioRelativo - segundos de retraso respecto a "ahora"
   * @param {number} volumen - volumen pico (0 a 1)
   */
  function reproducirNota({
    frecuenciaInicial,
    frecuenciaFinal = frecuenciaInicial,
    duracion = 0.15,
    tipoOnda = 'sine',
    inicioRelativo = 0,
    volumen = 0.2,
  }) {
    if (!estadoJuego.sonidoActivo) return; // respeta el botón de mute

    const ctx = obtenerContexto();
    const inicio = ctx.currentTime + inicioRelativo;
    const fin = inicio + duracion;

    // Oscilador: la fuente del sonido (la "nota")
    const oscilador = ctx.createOscillator();
    oscilador.type = tipoOnda;
    oscilador.frequency.setValueAtTime(frecuenciaInicial, inicio);
    oscilador.frequency.exponentialRampToValueAtTime(Math.max(frecuenciaFinal, 1), fin);

    // Nodo de ganancia: controla el volumen y evita "clicks" con un fundido
    const ganancia = ctx.createGain();
    ganancia.gain.setValueAtTime(0.0001, inicio);
    ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.02);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, fin);

    oscilador.connect(ganancia);
    ganancia.connect(ctx.destination);

    oscilador.start(inicio);
    oscilador.stop(fin + 0.02);
  }

  // 🔘 Sonido "boing" gracioso al presionar cualquier botón de jugada
  function sonidoClick() {
    reproducirNota({
      frecuenciaInicial: 220,
      frecuenciaFinal: 440,
      duracion: 0.12,
      tipoOnda: 'triangle',
      volumen: 0.15,
    });
  }

  // 🏆 Fanfarria chistosa y aguda al ganar la ronda
  function sonidoVictoria() {
    const notas = [523.25, 659.25, 783.99, 1046.5]; // Do - Mi - Sol - Do agudo
    notas.forEach((frecuencia, indice) => {
      reproducirNota({
        frecuenciaInicial: frecuencia,
        duracion: 0.16,
        tipoOnda: 'square',
        inicioRelativo: indice * 0.09,
        volumen: 0.14,
      });
    });
  }

  // 💀 Trompeta desafinada y grave al perder la ronda
  function sonidoDerrota() {
    reproducirNota({
      frecuenciaInicial: 300,
      frecuenciaFinal: 90,
      duracion: 0.55,
      tipoOnda: 'sawtooth',
      volumen: 0.16,
    });
  }

  // 🤝 Pop rápido y gracioso para el empate
  function sonidoEmpate() {
    reproducirNota({ frecuenciaInicial: 500, frecuenciaFinal: 500, duracion: 0.08, tipoOnda: 'sine', volumen: 0.15 });
    reproducirNota({ frecuenciaInicial: 700, frecuenciaFinal: 700, duracion: 0.08, tipoOnda: 'sine', inicioRelativo: 0.09, volumen: 0.15 });
  }

  // Sonido corto de interfaz (pausar, reiniciar, cambiar tema, etc.)
  function sonidoInterfaz() {
    reproducirNota({ frecuenciaInicial: 600, frecuenciaFinal: 800, duracion: 0.08, tipoOnda: 'sine', volumen: 0.1 });
  }

  // Exponemos solo las funciones que el resto del código necesita usar
  return {
    sonidoClick,
    sonidoVictoria,
    sonidoDerrota,
    sonidoEmpate,
    sonidoInterfaz,
  };
})();


/* ================================================================
   4. MÓDULO DE TEMA (claro / oscuro)
   ------------------------------------------------------------
   Alterna el atributo data-tema en <body>, que es lo que CSS usa
   para sobreescribir las variables de color (ver styles.css §2).
   La preferencia se guarda en localStorage para recordarla.
   ================================================================ */
function inicializarTema() {
  const temaGuardado = localStorage.getItem('ppt-arena-tema');
  const prefiereClaro = window.matchMedia('(prefers-color-scheme: light)').matches;
  const temaInicial = temaGuardado || (prefiereClaro ? 'claro' : 'oscuro');
  aplicarTema(temaInicial);
}

function aplicarTema(tema) {
  document.body.setAttribute('data-tema', tema);
  elementos.iconoTema.textContent = tema === 'claro' ? '☀️' : '🌙';
  elementos.btnTema.setAttribute('aria-pressed', String(tema === 'claro'));
  localStorage.setItem('ppt-arena-tema', tema);
}

function alternarTema() {
  const temaActual = document.body.getAttribute('data-tema');
  const nuevoTema = temaActual === 'claro' ? 'oscuro' : 'claro';
  aplicarTema(nuevoTema);
  AudioJuego.sonidoInterfaz();
}


/* ================================================================
   5. LÓGICA DE RONDAS
   ------------------------------------------------------------
   Funciones puras (sin tocar el DOM) que deciden el resultado de
   cada ronda según las reglas del juego.
   ================================================================ */

// Elige una jugada aleatoria para la CPU
function elegirJugadaCpu() {
  const indiceAleatorio = Math.floor(Math.random() * OPCIONES.length);
  return OPCIONES[indiceAleatorio];
}

/**
 * Compara la jugada del jugador contra la de la CPU.
 * @returns {'victoria'|'derrota'|'empate'}
 */
function calcularResultado(jugadaJugador, jugadaCpu) {
  if (jugadaJugador === jugadaCpu) return 'empate';
  if (REGLAS_VICTORIA[jugadaJugador] === jugadaCpu) return 'victoria';
  return 'derrota';
}

/**
 * Punto de entrada principal: se ejecuta cuando el jugador
 * pulsa uno de los botones de piedra / papel / tijera.
 */
function jugarRonda(jugadaJugador) {
  // Evita jugar si el juego está pausado, terminado o resolviendo otra ronda
  if (estadoJuego.enPausa || estadoJuego.juegoTerminado || estadoJuego.rondaEnCurso) return;

  estadoJuego.rondaEnCurso = true;
  AudioJuego.sonidoClick();

  const jugadaCpu = elegirJugadaCpu();
  const resultado = calcularResultado(jugadaJugador, jugadaCpu);

  // Actualiza puntuación y vidas según el resultado
  if (resultado === 'victoria') {
    estadoJuego.puntuacion += PUNTOS_VICTORIA;
  } else if (resultado === 'empate') {
    estadoJuego.puntuacion += PUNTOS_EMPATE;
  } else {
    estadoJuego.vidas -= 1;
  }

  // Pinta el resultado en pantalla (módulo de UI) con una pequeña
  // espera para que se sienta como una "revelación" de jugadas.
  pintarJugadas(jugadaJugador, jugadaCpu, resultado);

  setTimeout(() => {
    pintarResultado(resultado);
    pintarMarcador();

    if (resultado === 'victoria') AudioJuego.sonidoVictoria();
    if (resultado === 'derrota') AudioJuego.sonidoDerrota();
    if (resultado === 'empate') AudioJuego.sonidoEmpate();

    // Comprueba si el jugador se quedó sin vidas
    if (estadoJuego.vidas <= 0) {
      terminarPartida();
    }

    estadoJuego.rondaEnCurso = false;
  }, 450);
}


/* ================================================================
   6. ACTUALIZACIÓN DE LA INTERFAZ (UI)
   ------------------------------------------------------------
   Estas funciones son las únicas responsables de tocar el DOM.
   Reciben datos ya calculados y solo se encargan de "pintarlos".
   ================================================================ */

// Pinta los emojis de la jugada del jugador y la CPU, con animación
function pintarJugadas(jugadaJugador, jugadaCpu, resultado) {
  elementos.jugadaJugador.textContent = EMOJIS[jugadaJugador];
  elementos.jugadaCpu.textContent = EMOJIS[jugadaCpu];

  // Reinicia y vuelve a aplicar la animación de rebote (retrigger)
  [elementos.jugadaJugador, elementos.jugadaCpu].forEach((elemento) => {
    elemento.classList.remove('jugador-caja__icono--animar');
    // Forzamos un "reflow" para poder repetir la misma animación
    void elemento.offsetWidth;
    elemento.classList.add('jugador-caja__icono--animar');
  });

  // Limpia estados de color previos
  elementos.jugadaJugador.classList.remove(
    'jugador-caja__icono--gana',
    'jugador-caja__icono--pierde',
    'jugador-caja__icono--empata'
  );

  // Colorea el círculo del jugador según el resultado
  const claseEstado = {
    victoria: 'jugador-caja__icono--gana',
    derrota: 'jugador-caja__icono--pierde',
    empate: 'jugador-caja__icono--empata',
  }[resultado];
  elementos.jugadaJugador.classList.add(claseEstado);
}

// Escribe el mensaje de texto según el resultado de la ronda
function pintarResultado(resultado) {
  const mensajes = {
    victoria: `¡Ganaste la ronda! (+${PUNTOS_VICTORIA} pts) 🎉`,
    empate: `¡Empate! (+${PUNTOS_EMPATE} pts) 🤝`,
    derrota: '¡Perdiste una vida! 💥',
  };

  const clases = {
    victoria: 'mensaje-resultado--victoria',
    empate: 'mensaje-resultado--empate',
    derrota: 'mensaje-resultado--derrota',
  };

  elementos.mensajeResultado.textContent = mensajes[resultado];
  elementos.mensajeResultado.classList.remove(
    'mensaje-resultado--victoria',
    'mensaje-resultado--empate',
    'mensaje-resultado--derrota',
    'mensaje-resultado--animar'
  );
  void elementos.mensajeResultado.offsetWidth; // retrigger de animación
  elementos.mensajeResultado.classList.add(clases[resultado], 'mensaje-resultado--animar');
}

// Actualiza los números de puntuación y los corazones de vida
function pintarMarcador() {
  elementos.puntuacion.textContent = estadoJuego.puntuacion;

  elementos.corazones.forEach((corazon, indice) => {
    const vidaCorrespondiente = indice + 1;
    const perdida = vidaCorrespondiente > estadoJuego.vidas;
    corazon.classList.toggle('corazon--perdido', perdida);
  });

  elementos.vidas.setAttribute('aria-label', `${estadoJuego.vidas} vidas restantes`);
}


/* ================================================================
   7. CONTROL DE PARTIDA (pausa / reinicio / game over)
   ================================================================ */

function alternarPausa() {
  if (estadoJuego.juegoTerminado) return;

  estadoJuego.enPausa = !estadoJuego.enPausa;
  elementos.overlayPausa.classList.toggle('oculto', !estadoJuego.enPausa);
  elementos.btnPausa.textContent = estadoJuego.enPausa ? '▶️ Reanudar' : '⏸️ Pausa';
  actualizarDisponibilidadBotones();
  AudioJuego.sonidoInterfaz();
}

function terminarPartida() {
  estadoJuego.juegoTerminado = true;
  elementos.puntuacionFinal.textContent = estadoJuego.puntuacion;
  elementos.overlayGameOver.classList.remove('oculto');
  actualizarDisponibilidadBotones();
}

// Reinicia todo el estado del juego a sus valores iniciales
function reiniciarPartida() {
  estadoJuego.puntuacion = 0;
  estadoJuego.vidas = estadoJuego.vidasMaximas;
  estadoJuego.enPausa = false;
  estadoJuego.juegoTerminado = false;
  estadoJuego.rondaEnCurso = false;

  elementos.jugadaJugador.textContent = '❓';
  elementos.jugadaCpu.textContent = '❓';
  elementos.jugadaJugador.classList.remove(
    'jugador-caja__icono--gana',
    'jugador-caja__icono--pierde',
    'jugador-caja__icono--empata'
  );

  elementos.mensajeResultado.textContent = 'Elige tu jugada para comenzar la partida';
  elementos.mensajeResultado.classList.remove(
    'mensaje-resultado--victoria',
    'mensaje-resultado--empate',
    'mensaje-resultado--derrota'
  );

  elementos.btnPausa.textContent = '⏸️ Pausa';
  elementos.overlayPausa.classList.add('oculto');
  elementos.overlayGameOver.classList.add('oculto');

  pintarMarcador();
  actualizarDisponibilidadBotones();
  AudioJuego.sonidoInterfaz();
}

// Habilita/deshabilita los botones de jugada según el estado actual
function actualizarDisponibilidadBotones() {
  const deshabilitar = estadoJuego.enPausa || estadoJuego.juegoTerminado;
  elementos.botonesJugada.forEach((boton) => {
    boton.disabled = deshabilitar;
  });
}


/* ================================================================
   8. EVENT LISTENERS
   ------------------------------------------------------------
   Conecta cada botón de la interfaz con su función correspondiente.
   ================================================================ */

// Botones de jugada (piedra / papel / tijera)
elementos.botonesJugada.forEach((boton) => {
  boton.addEventListener('click', () => {
    // Micro-animación de "presionado" en el propio botón
    boton.classList.remove('btn-jugada--presionado');
    void boton.offsetWidth;
    boton.classList.add('btn-jugada--presionado');

    const jugadaElegida = boton.getAttribute('data-jugada');
    jugarRonda(jugadaElegida);
  });
});

// Pausa / Reanudar
elementos.btnPausa.addEventListener('click', alternarPausa);
elementos.btnReanudar.addEventListener('click', alternarPausa);

// Reiniciar (desde el marcador o desde la pantalla de game over)
elementos.btnReiniciar.addEventListener('click', reiniciarPartida);
elementos.btnJugarDeNuevo.addEventListener('click', reiniciarPartida);

// Silenciar / activar sonido
elementos.btnSonido.addEventListener('click', () => {
  estadoJuego.sonidoActivo = !estadoJuego.sonidoActivo;
  elementos.iconoSonido.textContent = estadoJuego.sonidoActivo ? '🔊' : '🔇';
  elementos.btnSonido.setAttribute('aria-pressed', String(!estadoJuego.sonidoActivo));
  if (estadoJuego.sonidoActivo) AudioJuego.sonidoInterfaz();
});

// Cambiar tema claro / oscuro
elementos.btnTema.addEventListener('click', alternarTema);

// Atajos de teclado: 1 = piedra, 2 = papel, 3 = tijera, P = pausa
document.addEventListener('keydown', (evento) => {
  const mapaTeclas = { '1': 'piedra', '2': 'papel', '3': 'tijera' };
  if (mapaTeclas[evento.key]) {
    jugarRonda(mapaTeclas[evento.key]);
  } else if (evento.key.toLowerCase() === 'p') {
    alternarPausa();
  }
});


/* ================================================================
   9. INICIALIZACIÓN
   ------------------------------------------------------------
   Se ejecuta una vez al cargar la página: aplica el tema guardado
   y deja el marcador en su estado inicial.
   ================================================================ */
function iniciar() {
  inicializarTema();
  pintarMarcador();
  // Activa el pulso del VS mientras se espera la primera jugada
  elementos.vsCentral.classList.add('vs-central--pulso');
}

iniciar();
