package io.github.kartollikaa.shapestudio.engine.build

import io.github.kartollikaa.shapestudio.engine.document.Point
import io.github.kartollikaa.shapestudio.engine.document.Rounding
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

internal data class Corner(val point: Point, val rounding: Rounding)

// Ported from androidx.compose.material3.MaterialShapes.doRepeat (Apache License 2.0).
internal fun expandRepeat(slice: List<Corner>, count: Int, center: Point, mirror: Boolean): List<Corner> =
    if (mirror) {
        buildList {
            val angles = slice.map { (it.point - center).angleDegrees() }
            val distances = slice.map { (it.point - center).distance() }
            val sections = count * 2
            val sectionAngle = 360f / sections
            repeat(sections) { section ->
                slice.indices.forEach { index ->
                    val i = if (section % 2 == 0) index else slice.lastIndex - index
                    if (i > 0 || section % 2 == 0) {
                        val a = (
                            sectionAngle * section +
                                if (section % 2 == 0) angles[i] else sectionAngle - angles[i] + 2 * angles[0]
                            ).toRadians()
                        add(Corner(Point(cos(a) * distances[i] + center.x, sin(a) * distances[i] + center.y), slice[i].rounding))
                    }
                }
            }
        }
    } else {
        (0 until slice.size * count).map {
            val corner = slice[it % slice.size]
            Corner(corner.point.rotateDegrees((it / slice.size) * 360f / count, center), corner.rounding)
        }
    }

private operator fun Point.minus(other: Point) = Point(x - other.x, y - other.y)

private fun Point.distance() = sqrt(x * x + y * y)

private fun Point.angleDegrees() = atan2(y, x) * 180f / PI.toFloat()

private fun Float.toRadians() = this / 360f * 2 * PI.toFloat()

private fun Point.rotateDegrees(angle: Float, center: Point): Point {
    val a = angle.toRadians()
    val off = this - center
    return Point(off.x * cos(a) - off.y * sin(a) + center.x, off.x * sin(a) + off.y * cos(a) + center.y)
}
