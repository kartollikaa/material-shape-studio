package io.github.kartollikaa.shapestudio.engine.build

import androidx.graphics.shapes.RoundedPolygon
import androidx.collection.FloatFloatPair
import io.github.kartollikaa.shapestudio.engine.document.Transform
import io.github.kartollikaa.shapestudio.engine.document.reject
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

internal fun Transform.applyTo(polygon: RoundedPolygon, index: Int): RoundedPolygon = when (this) {
    Transform.Normalize -> polygon.normalized()
    is Transform.Rotate -> polygon.rotated(degrees)
    is Transform.Scale -> polygon.transformed { px, py -> FloatFloatPair(x * px, y * py) }
    is Transform.Translate -> polygon.transformed { px, py -> FloatFloatPair(px + x, py + y) }
    Transform.FillSquare -> polygon.filledToSquare(index)
    is Transform.StartAngle -> polygon.startingAt(degrees)
}

// The library's calculateBounds starts its maxima at Float.MIN_VALUE, so maxima are measured on the mirrored shape.
private const val MIN_EXTENT = 1e-4f

// Compose's Matrix.rotateZ: angle to radians in double, sine and cosine rounded to float.
private fun RoundedPolygon.rotated(degrees: Float): RoundedPolygon {
    val r = degrees * (PI / 180.0)
    val s = sin(r).toFloat()
    val c = cos(r).toFloat()
    return transformed { x, y -> FloatFloatPair(c * x - s * y, s * x + c * y) }
}

private fun RoundedPolygon.filledToSquare(index: Int): RoundedPolygon {
    val (left, top) = calculateBounds(approximate = false)
    val (mirroredLeft, mirroredTop) = transformed { x, y -> FloatFloatPair(-x, -y) }.calculateBounds(approximate = false)
    val right = -mirroredLeft
    val bottom = -mirroredTop
    val width = right - left
    val height = bottom - top
    if (width < MIN_EXTENT || height < MIN_EXTENT) reject("transforms[$index]", "fillSquare needs a shape with a width and a height")
    return transformed { x, y -> FloatFloatPair((x - left) / width, (y - top) / height) }
}

// Compose's toPath(startAngle): rotate about the origin so the first cubic starts at the angle.
private fun RoundedPolygon.startingAt(degrees: Int): RoundedPolygon {
    if (degrees == 0) return this
    val first = cubics.first()
    val angleToFirst = (atan2(first.anchor0Y - centerY, first.anchor0X - centerX) * 180.0 / PI).toFloat()
    return rotated(-angleToFirst + degrees)
}
