package io.github.kartollikaa.shapestudio.engine.document

class DocumentException(val field: String, reason: String) : IllegalArgumentException("$field: $reason")

internal fun reject(field: String, reason: String): Nothing = throw DocumentException(field, reason)
