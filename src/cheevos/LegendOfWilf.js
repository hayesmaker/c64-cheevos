import signal from 'signal-js';

class LegendOfWilf {
  constructor() {
    console.log('LegendOfWilf initialized');
    this.livesLost = 0;
    this.hasLostLife = false;
    this.watcher = signal();
    this.cheevos = [];
  }



  getLives = () => {
    // return parseInt(this.cpuReadNS(0x824c).toString(16));
    return 0;
  }

  execute = () => {

    const currentLivesLost = this.getLives();
    if (currentLivesLost > this.livesLost) {
      this.livesLost = currentLivesLost;
      this.hasLostLife = true;
    }

    this.cheevos.forEach(c => {
      if (!c.isPopped && c.check()) {
        c.isPopped = true;
        console.log(c.title, c.message);
        this.watcher.dispatch('cheevo', {
          title: c.title,
          message: c.message
        });
      }
    });
  }

}

export default LegendOfWilf;
