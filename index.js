import Point from './point.js'

const TransitionDuration = 3000
const AutoPlayInterval = 5000

const data = {}

const Notification = {
  error: function (msg) {
    alert(`Error: ${msg}`)
  }
}

async function main() {
  [this.svgDocument, this.coordinateJson] = await Promise.all([
    d3.svg('./matrix-coordinate.defs.svg'),
    d3.json('./matrix-coordinate.json'),
  ])

  this.viewBox = [0, 0, 200, 200]

  const container = d3.select('.coordinate-container')
  container.append(() => this.svgDocument.documentElement)
  container.select('svg')
    .attr('viewBox', this.viewBox.join(' '))
  const svgGroupContainer = container.select('.svg-container')

  this.bgLinesContainer = svgGroupContainer.append('g')
    .classed('bg-lines-container', true)

  this.linesContainer = svgGroupContainer.append('g')
    .classed('lines-container', true)
  resetSvg()

  // 绘制坐标轴
  renderAxis(svgGroupContainer, this.viewBox)
}

function renderAxis(selection, size) {
  const optBase = {
    domain: [-1, 0, 1],
    ticks: 4,
  }
  const axesContainer = selection.append('g')
    .classed('axes', true)
    .attr('color', '#555555')

  renderAxisHeler(axesContainer, 'axisBottomX', { ...optBase, orient: 'top' }, size)
    .selectAll('.tick text')
    .attr('transform', 'translate(0 20)')

  renderAxisHeler(axesContainer, 'axisLeftY', { ...optBase, domain: d3.reverse(optBase.domain), orient: 'right' }, size)
    .selectAll('.tick text')
    .attr('transform', 'translate(-30 0)')

  renderAxisHeler(axesContainer, 'axisTopX', { ...optBase, orient: 'bottom' }, size)
    .selectAll('.tick text')
    .remove()

  renderAxisHeler(axesContainer, 'axisRightY', { ...optBase, domain: d3.reverse(optBase.domain), orient: 'left' }, size)
    .selectAll('.tick text')
    .remove()
}

function renderAxisHeler(selection, className, options, size) {
  const axisFn = {
    top: d3.axisTop,
    bottom: d3.axisBottom,
    left: d3.axisLeft,
    right: d3.axisRight,
  }
  const { orient, domain, ticks } = options
  const [minX, minY, maxX, maxY] = size
  const width = (maxX - minX)
  const height = (maxY - minY)
  const translate = {
    top: [0, height],
    bottom: [0, 0],
    left: [width, 0],
    right: [0, 0],
  }
  const scale = d3.scaleLinear(domain, [minX, width / 2, maxX])
  const axis = axisFn[orient](scale).ticks(ticks)
  const axisContainer = selection.append('g')
    .attr('transform', `translate(${translate[orient].join(' ')})`)
    .classed(className, true)
  axis(axisContainer)
  return axisContainer
}

function getGridLines(axisXNum, axisYNum, size=[0, 0, axisXNum, axisYNum]) {
  const axisLines = []
  const [minX, minY, maxX, maxY] = size
  const width = (maxX - minX)
  const height = (maxY - minY)
  const stepX = width / axisXNum
  const stepY = height / axisYNum
  for (let x = minX; x <= maxX; x += stepX) {
    axisLines.push({
      startPoint: new Point(x, minY).setOrigin(width / 2, height / 2),
      endPoint: new Point(x, maxY).setOrigin(width / 2, height / 2),
    })
  }
  for (let y = minY; y <= maxY; y += stepY) {
    axisLines.push({
      startPoint: new Point(minX, y).setOrigin(width / 2, height / 2),
      endPoint: new Point(maxX, y).setOrigin(width / 2, height / 2),
    })
  }
  return axisLines
}

function getLines(lines, size=[0, 0, 1, 1]) {
  const [minX, minY, maxX, maxY] = size
  const width = (maxX - minX)
  const height = (maxY - minY)
  const m = [width / 2, 0, 0, - height / 2, width / 2, height / 2]
  return lines.map(line => {
    const [[x1, y1], [x2, y2]] = line.points
    return {
      id: line.id,
      startPoint: new Point(x1, y1).matrix(...m).setOrigin(width / 2, height / 2),
      endPoint: new Point(x2, y2).matrix(...m).setOrigin(width / 2, height / 2),
      attrs: line.attrs
    }
  })
}

function renderLines(selection, className, lines, attrs={}) {
  const updateSelection = selection.selectAll(`.${className}`).data(lines)
  updateSelection
    .interrupt()
    .transition()
    .duration(TransitionDuration)
    .attrs(d => ({
      ...attrs,
      ...(d.attrs || {}),
      'x1': d.startPoint.x,
      'y1': d.startPoint.y,
      'x2': d.endPoint.x,
      'y2': d.endPoint.y,
    }))

  updateSelection.enter()
    .append('line')
    .classed(className, true)
    .attrs(d => ({
      ...attrs,
      ...(d.attrs || {}),
      'x1': d.startPoint.x,
      'y1': d.startPoint.y,
      'x2': d.endPoint.x,
      'y2': d.endPoint.y,
    }))

  updateSelection.exit()
    .remove()
}

function getMatrix() {
  const values = []
  d3.selectAll('.matrix-input .el input')
    // no array function
    .each(function() {
      values.push(d3.select(this).property('value'))
    })
  const [a, b, c, d] = values.map(v => parseFloat(v))
  return [a, b, c, d, 0, 0]
}

function resetSvg() {
  data.bgLines = getGridLines(data.coordinateJson.grids.x, data.coordinateJson.grids.y, data.viewBox)
  renderLines(
    data.bgLinesContainer,
    'grid-lines',
    data.bgLines,
    data.coordinateJson.grids.attrs,
  )
  data.lines = getLines(data.coordinateJson.lines, data.viewBox)
  renderLines(
    data.linesContainer,
    'lines',
    data.lines,
  )
  data.isTranslated = false
}
window.resetSvg = resetSvg

function playAnimation() {
  const m = getMatrix()
  console.log('lihs debug:', m)
  if (m.some(Number.isNaN)) {
    Notification.error('You Input Some Invalid Number!')
    return
  }
  data.bgLines = data.bgLines.map(line => ({
    ...line,
    startPoint: line.startPoint.matrix(...m),
    endPoint: line.endPoint.matrix(...m),
  }))
  renderLines(
    data.bgLinesContainer,
    'grid-lines',
    data.bgLines,
    data.coordinateJson.grids.attrs,
  )
  data.lines = data.lines.map(line => ({
    ...line,
    startPoint: line.startPoint.matrix(...m),
    endPoint: line.endPoint.matrix(...m),
  }))
  renderLines(
    data.linesContainer,
    'lines',
    data.lines,
  )
  data.isTranslated = true
}
window.playAnimation = playAnimation

let autoPlayTimer = null
function autoPlay(isReset = true) {
  if (isReset) {
    resetSvg()
  } else {
    playAnimation()
  }
  autoPlayTimer = setTimeout(() => autoPlay(!isReset), AutoPlayInterval)
}
function toggleAutoPlay() {
  const isAutoPlay = d3.select('#autoPlayInput').property('checked')
  if (isAutoPlay) {
    autoPlay(data.isTranslated)
  } else if (autoPlayTimer !== null) {
    clearTimeout(autoPlayTimer)
  }
}
window.toggleAutoPlay = toggleAutoPlay

window.onload = function() {
  // const autoPlayInput = document.getElementById('autoPlayInput')
  // const progressInput = document.getElementById('progressInput')
  // const progressOutput = document.getElementById('progressOutput')

  main.call(data)
}
