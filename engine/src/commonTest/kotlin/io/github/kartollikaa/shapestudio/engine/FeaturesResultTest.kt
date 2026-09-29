package io.github.kartollikaa.shapestudio.engine

import androidx.graphics.shapes.CornerRounding
import androidx.graphics.shapes.Feature
import androidx.graphics.shapes.RoundedPolygon
import androidx.graphics.shapes.star
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FeaturesResultTest {
    private val starJson = """{"v":1,"shape":{"kind":"star","verticesPerRadius":5,"innerRadius":0.5,"rounding":{"radius":0.1}}}"""
    private val libraryStar = RoundedPolygon.star(numVerticesPerRadius = 5, innerRadius = 0.5f, rounding = CornerRounding(0.1f))

    @Test
    fun featuresAreTypedAsTheLibraryClassifiesThem() {
        val types = ShapeEngine.build(starJson).features.map { it.type }
        assertEquals(libraryStar.features.map { it.expectedType() }, types)
        assertTrue("convex" in types && "concave" in types, "a star has both corner kinds: $types")
    }

    @Test
    fun eachFeatureCarriesItsOwnCubics() {
        val built = ShapeEngine.build(starJson).features
        assertEquals(libraryStar.features.size, built.size)
        built.zip(libraryStar.features).forEach { (actual, expected) ->
            val flat = expected.cubics.flatMap {
                listOf(it.anchor0X, it.anchor0Y, it.control0X, it.control0Y, it.control1X, it.control1Y, it.anchor1X, it.anchor1Y)
            }
            assertContentEquals(flat.toFloatArray(), actual.cubics)
        }
    }

    private fun Feature.expectedType() = when {
        isConvexCorner -> "convex"
        isConcaveCorner -> "concave"
        isEdge -> "edge"
        else -> "ignorable"
    }
}
