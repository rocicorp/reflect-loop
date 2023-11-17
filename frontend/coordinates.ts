export type Position = {
  x: number;
  y: number;
};

export class Rect {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly width: number,
    readonly height: number
  ) {}
  left() {
    return this.x;
  }
  top() {
    return this.y;
  }
  right() {
    return this.x + this.width;
  }
  bottom() {
    return this.y + this.height;
  }
}

// TODO(greg): comment
export const positionToCoordinate = (
  position: Position,
  appRect: Rect,
  docRect: Rect
) => {
  let x: number;
  if (position.x < appRect.x) {
    const gutterWidth = appRect.x - docRect.x;
    const posWithinGutter = position.x - docRect.x;
    x = posWithinGutter / gutterWidth - 1;
  } else if (position.x > appRect.right()) {
    const gutterWidth = docRect.right() - appRect.right();
    const posWithinGutter = position.x - appRect.right();
    x = posWithinGutter / gutterWidth + 1;
  } else {
    x = (position.x - appRect.x) / appRect.width;
  }
  let y: number;
  if (position.y < appRect.y) {
    const gutterHeight = appRect.y - docRect.y;
    const posWithinGutter = position.y - docRect.y;
    y = posWithinGutter / gutterHeight - 1;
  } else if (position.y > appRect.bottom()) {
    const gutterHeight = docRect.bottom() - appRect.bottom();
    const posWithinGutter = position.y - appRect.bottom();
    y = posWithinGutter / gutterHeight + 1;
  } else {
    y = (position.y - appRect.y) / appRect.height;
  }
  return { x, y };
};

export const coordinateToPosition = (
  coord: Position,
  appRect: Rect,
  docRect: Rect
) => {
  let x = -1;
  if (coord.x < 0) {
    // translate coord back into domain [0..1] then multiply by left margin.
    const gutterWidth = appRect.x - docRect.x;
    const posWithinGutter = (coord.x + 1) * gutterWidth;
    x = docRect.x + posWithinGutter;
  } else if (coord.x > 1) {
    // same for right margin.
    const gutterWidth = docRect.right() - appRect.right();
    const posWithinGutter = (coord.x - 1) * gutterWidth;
    x = appRect.right() + posWithinGutter;
  } else {
    x = appRect.x + coord.x * appRect.width;
  }

  // same for bottom
  let y = -1;
  if (coord.y < 0) {
    const gutterHeight = appRect.y - docRect.y;
    const posWithinGutter = (coord.y + 1) * gutterHeight;
    y = docRect.y + posWithinGutter;
  } else if (coord.y > 1) {
    const gutterHeight = docRect.bottom() - appRect.bottom();
    const posWithinGutter = (coord.y - 1) * gutterHeight;
    y = appRect.bottom() + posWithinGutter;
  } else {
    y = appRect.y + coord.y * appRect.height;
  }
  return { x, y };
};
