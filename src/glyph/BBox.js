export default class BBox {
  constructor(minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity) {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  }
      
  get width() {
    return this.maxX - this.minX;
  }

  get height() {
    return this.maxY - this.minY;
  }
    
  addPoint(x, y) {
    if (x < this.minX) {
      this.minX = x;
    }
      
    if (y < this.minY) {
      this.minY = y;
    }
      
    if (x > this.maxX) {
      this.maxX = x;
    }
      
    if (y > this.maxY) {
      this.maxY = y;
    }
  }
      
  copy() {
    return new BBox(this.minX, this.minY, this.maxX, this.maxY);
  }
}
