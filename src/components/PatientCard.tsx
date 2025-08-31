import React from 'react'
import { TouchableOpacity, View, Text } from 'react-native'

export type Patient = {
  id: string
  name: string
  age: number
  medicalNumber: string
  lastVisit: string
  condition: string
  urgency: 'low' | 'medium' | 'high'
}

const urgencyColors: Record<Patient['urgency'], { bg: string; text: string }> = {
  high: { bg: 'bg-red-100', text: 'text-red-600' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  low: { bg: 'bg-green-100', text: 'text-green-600' },
}

export function PatientCard({
  patient,
  onPress,
}: {
  patient: Patient
  onPress: () => void
}) {
  const c = urgencyColors[patient.urgency]

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl p-4 mb-4 shadow-md"
    >
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View>
          <Text className="text-lg font-bold text-gray-800">{patient.name}</Text>
          <Text className="text-sm text-gray-500 font-medium">
            {patient.medicalNumber}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm text-gray-600 mb-1">Age {patient.age}</Text>
          <View className={`${c.bg} px-2 py-1 rounded-full`}>
            <Text className={`text-xs font-semibold ${c.text}`}>
              {patient.urgency.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <View className="mb-4 space-y-1">
        <View className="flex-row">
          <Text className="w-20 text-sm text-gray-500">Condition:</Text>
          <Text className="text-sm text-gray-800 font-medium">
            {patient.condition}
          </Text>
        </View>
        <View className="flex-row">
          <Text className="w-20 text-sm text-gray-500">Last Visit:</Text>
          <Text className="text-sm text-gray-800 font-medium">
            {patient.lastVisit}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row space-x-3">
        <TouchableOpacity className="flex-1 bg-blue-600 rounded-lg py-2">
          <Text className="text-white font-medium text-center">🎙️ Record</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-gray-100 rounded-lg py-2">
          <Text className="text-gray-700 font-medium text-center">
            📋 View Notes
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}
