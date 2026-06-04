import { RBPEngine } from './src/lib/rbp-engine';
import { ARSENAL } from './src/lib/unit-database';
import { Terrain, VehicleState } from './src/lib/logistics';
import assert from 'assert';

async function runTests() {
    console.log('🚀 Starting Simulation-Grade Integration Tests...');

    try {
        // Test 1: Logistics & Movement
        console.log('Testing Logistics & Movement...');
        const engine1 = new RBPEngine();
        const unitInfo = ARSENAL['T-90M Proryv'];
        const id = engine1.addUnit(unitInfo, 50, 50);
        const overview1 = engine1.getOverview();
        const unit1 = overview1.units.find(u => u.id === id);
        
        if (!unit1 || !unit1.logistics) throw new Error('Unit or Logistics missing');
        
        const initialFuel = unit1.logistics.state.fuel.current;
        engine1.setWaypoint(id, 60, 60);
        for (let i = 0; i < 100; i++) engine1.stepSimulation(16);
        
        const finalFuel = unit1.logistics.state.fuel.current;
        assert(finalFuel < initialFuel, `Fuel should be consumed. Initial: ${initialFuel}, Final: ${finalFuel}`);
        console.log('✅ Logistics & Movement: PASSED');

        // Test 2: Environment Effects
        console.log('Testing Environment Effects...');
        const engine2 = new RBPEngine();
        const airId = engine2.addUnit(ARSENAL['F-35A Lightning II'], 50, 50);
        engine2.setWeather('Clear');
        const potClear = engine2.getOverview().units.find(u => u.id === airId)!.potential;
        engine2.setWeather('Storm');
        const potStorm = engine2.getOverview().units.find(u => u.id === airId)!.potential;
        assert(potStorm < potClear, `Storm should reduce potential. Clear: ${potClear}, Storm: ${potStorm}`);
        console.log('✅ Environment Effects: PASSED');

        // Test 3: Engagement
        console.log('Testing Engagement...');
        const engine3 = new RBPEngine();
        const natoId = engine3.addUnit(ARSENAL['Leopard 2A8'], 10, 10);
        const rusId = engine3.addUnit(ARSENAL['T-90M Proryv'], 15, 15);
        for (let i = 0; i < 200; i++) engine3.stepSimulation(16);
        const units3 = engine3.getOverview().units;
        const nato = units3.find(u => u.id === natoId)!;
        const rus = units3.find(u => u.id === rusId)!;
        assert(nato.targetId === rusId || rus.targetId === natoId, 'Units should have locked on');
        console.log('✅ Engagement: PASSED');

        // Test 4: Immobilization
        console.log('Testing Immobilization...');
        const engine4 = new RBPEngine();
        const tankId = engine4.addUnit(ARSENAL['T-90M Proryv'], 50, 50);
        const tank = engine4.getOverview().units.find(u => u.id === tankId)!;
        tank.logistics.state.fuel.current = 0;
        engine4.setWaypoint(tankId, 60, 60);
        engine4.stepSimulation(16);
        assert(tank.vx === 0 && tank.vy === 0, 'Unit without fuel should not move');
        console.log('✅ Immobilization: PASSED');

        console.log('\n✨ ALL SIMULATION-GRADE TESTS PASSED! ✨');
    } catch (err) {
        console.error('❌ TEST FAILED:', err);
        process.exit(1);
    }
}

runTests();
