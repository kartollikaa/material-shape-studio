package io.github.kartollikaa.shapestudio.engine

import androidx.graphics.shapes.RoundedPolygon
import kotlin.test.Test
import kotlin.test.assertEquals

class GraphicsShapesLinkTest {
    @Test
    fun unroundedSquareSpansTheUnitCircle() {
        val bounds = RoundedPolygon(numVertices = 4).calculateBounds()

        floatArrayOf(-1f, -1f, 1f, 1f).forEachIndexed { i, expected ->
            assertEquals(expected, bounds[i], absoluteTolerance = 1e-5f)
        }
    }
}
