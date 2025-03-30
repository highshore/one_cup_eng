export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">환영합니다</h1>
        <p className="text-xl text-gray-600">당신의 모든 요구 사항을 충족하는 최고의 서비스</p>
      </header>
      
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">혁신적인 기능</h2>
          <p className="text-gray-700">최신 기술을 활용한 혁신적인 솔루션을 제공합니다.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">전문적인 지원</h2>
          <p className="text-gray-700">24시간 전문가의 지원을 받을 수 있습니다.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">고객 맞춤 서비스</h2>
          <p className="text-gray-700">고객의 요구에 맞춘 맞춤형 서비스를 제공합니다.</p>
        </div>
      </section>
      
      <section className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-6">고객이 신뢰하는 서비스</h2>
        <p className="text-lg text-gray-700 mb-8">수천 명의 만족한 고객들이 우리의 서비스를 선택했습니다.</p>
        <button className="bg-blue-600 text-white py-2 px-6 rounded-full text-lg font-semibold hover:bg-blue-700 transition-colors">
          지금 시작하기
        </button>
      </section>
      
      <footer className="text-center text-gray-600">
        <p>© 2023 당신의 회사명. 모든 권리 보유.</p>
      </footer>
    </div>
  )
}